/**
 * Zero-Dependency QuickTime (.mov) Container Muxer with 32-bit RGBA Alpha Transparency Support
 * Encapsulates frames into 100% compliant QuickTime (.mov) files with 'rle ' (Apple Animation), 'png ', or 'raw ' tracks.
 * Natively decoded with full alpha transparency in Apple QuickTime, Adobe Premiere Pro, After Effects,
 * DaVinci Resolve, CapCut, Final Cut Pro, and VLC.
 */

export interface MovMuxerOptions {
  width: number;
  height: number;
  fps: number;
  fourcc?: 'rle ' | 'qtrle' | 'png ' | 'raw ';
}

// Reusable scratch buffer to avoid allocating megabytes on every frame
let _reusableRleBuffer: Uint8Array | null = null;

function getRleScratchBuffer(neededSize: number): Uint8Array {
  if (!_reusableRleBuffer || _reusableRleBuffer.length < neededSize) {
    _reusableRleBuffer = new Uint8Array(neededSize);
  }
  return _reusableRleBuffer;
}

/**
 * Encodes an RGBA ImageData buffer into Apple QuickTime Animation (RLE) 32-bit ARGB keyframe bitstream.
 * Specification: Apple QuickTime File Format / QuickTime Video RLE (FourCC: 'rle ').
 */
export function encodeQuickTimeRle32(imageData: ImageData, width: number, height: number): Uint8Array {
  const rgba = imageData.data;
  // Maximum possible byte length: 8 (chunk header) + height * (4 + width * 5)
  const maxBytes = 8 + height * (4 + width * 5);
  const out = getRleScratchBuffer(maxBytes);
  let outIdx = 6; // Reserve first 4 bytes for chunk_size, next 2 bytes for header_flags

  // Header flags: 0x0000 (keyframe covering entire image from line 0)
  out[4] = 0x00;
  out[5] = 0x00;

  for (let y = 0; y < height; y++) {
    // Line start marker: 0x01 (skip_code = 1 line, start at x = 0)
    out[outIdx++] = 0x01;

    const rowStartPixel = y * width;
    let x = 0;

    while (x < width) {
      const curPixelIdx = (rowStartPixel + x) * 4;
      const r = rgba[curPixelIdx];
      const g = rgba[curPixelIdx + 1];
      const b = rgba[curPixelIdx + 2];
      const a = rgba[curPixelIdx + 3];

      // Count identical consecutive pixels (up to max run length of 127)
      let runLength = 1;
      const maxRun = Math.min(127, width - x);

      while (runLength < maxRun) {
        const nextPixelIdx = (rowStartPixel + x + runLength) * 4;
        if (
          rgba[nextPixelIdx] === r &&
          rgba[nextPixelIdx + 1] === g &&
          rgba[nextPixelIdx + 2] === b &&
          rgba[nextPixelIdx + 3] === a
        ) {
          runLength++;
        } else {
          break;
        }
      }

      if (runLength >= 2) {
        // Repeat packet: count is negative (-runLength)
        // In signed 8-bit arithmetic: -runLength is (256 - runLength)
        out[outIdx++] = (256 - runLength) & 0xff;
        // 32-bit ARGB pixel: Alpha, Red, Green, Blue
        out[outIdx++] = a;
        out[outIdx++] = r;
        out[outIdx++] = g;
        out[outIdx++] = b;
        x += runLength;
      } else {
        // Literal packet: gather non-repeating pixels
        let litCount = 0;
        const maxLit = Math.min(127, width - x);

        while (litCount < maxLit) {
          const scanX = x + litCount;
          // Check if a run of >= 2 identical pixels starts at scanX
          if (scanX + 1 < width) {
            const idx1 = (rowStartPixel + scanX) * 4;
            const idx2 = (rowStartPixel + scanX + 1) * 4;
            if (
              rgba[idx1] === rgba[idx2] &&
              rgba[idx1 + 1] === rgba[idx2 + 1] &&
              rgba[idx1 + 2] === rgba[idx2 + 2] &&
              rgba[idx1 + 3] === rgba[idx2 + 3]
            ) {
              if (litCount === 0) break;
              break;
            }
          }
          litCount++;
        }

        if (litCount === 0) {
          continue;
        }

        // Write literal packet header (positive count)
        out[outIdx++] = litCount & 0xff;
        for (let i = 0; i < litCount; i++) {
          const pIdx = (rowStartPixel + x + i) * 4;
          out[outIdx++] = rgba[pIdx + 3]; // A (Alpha)
          out[outIdx++] = rgba[pIdx];     // R
          out[outIdx++] = rgba[pIdx + 1]; // G
          out[outIdx++] = rgba[pIdx + 2]; // B
        }
        x += litCount;
      }
    }

    // End of line marker: 0x00
    out[outIdx++] = 0x00;
  }

  // Set total chunk_size in first 4 bytes (big endian)
  const chunkSize = outIdx;
  const dv = new DataView(out.buffer, out.byteOffset, chunkSize);
  dv.setUint32(0, chunkSize, false);

  // CLONE only the exact compressed slice so the large scratch buffer isn't pinned in memory
  return out.slice(0, chunkSize);
}

export class QuickTimeMovMuxer {
  private width: number;
  private height: number;
  private fps: number;
  private timescale: number;
  private fourcc: string;
  private frameChunks: Uint8Array[] = [];
  private frameSizes: number[] = [];

  constructor(options: MovMuxerOptions) {
    this.width = options.width;
    this.height = options.height;
    this.fps = options.fps;
    this.timescale = 600; // Standard QuickTime timescale
    // Canonical QuickTime Animation fourcc is 'rle ' (with trailing space)
    this.fourcc = options.fourcc === 'qtrle' || options.fourcc === 'rle ' ? 'rle ' : (options.fourcc || 'rle ');
  }

  public addFrame(chunk: Uint8Array) {
    this.frameChunks.push(chunk);
    this.frameSizes.push(chunk.length);
  }

  public finalize(): Blob {
    const totalFrames = this.frameChunks.length;
    const duration = Math.round(totalFrames * (this.timescale / this.fps));

    // 1. Build 'ftyp' box (QuickTime movie brand)
    const ftyp = this.createFtypBox();

    // 2. Build 'mdat' box (media data containing all frames)
    const totalMdatPayloadSize = this.frameSizes.reduce((a, b) => a + b, 0);
    const mdatHeader = new Uint8Array(8);
    const mdatView = new DataView(mdatHeader.buffer);
    mdatView.setUint32(0, 8 + totalMdatPayloadSize, false);
    this.writeFourCC(mdatHeader, 4, 'mdat');

    const mdatOffset = ftyp.length;
    const firstFrameOffset = mdatOffset + 8;

    // Calculate sample chunk offsets inside mdat
    const chunkOffsets: number[] = [];
    let curOffset = firstFrameOffset;
    for (let i = 0; i < totalFrames; i++) {
      chunkOffsets.push(curOffset);
      curOffset += this.frameSizes[i];
    }

    // 3. Build 'moov' box
    const moov = this.createMoovBox(duration, totalFrames, chunkOffsets);

    // Combine all parts into single Blob
    const parts: (Uint8Array | ArrayBuffer)[] = [ftyp, mdatHeader];
    for (let i = 0; i < this.frameChunks.length; i++) {
      parts.push(this.frameChunks[i]);
    }
    parts.push(moov);

    return new Blob(parts, { type: 'video/quicktime' });
  }

  private createFtypBox(): Uint8Array {
    const box = new Uint8Array(20);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 20, false); // length
    this.writeFourCC(box, 4, 'ftyp');
    this.writeFourCC(box, 8, 'qt  '); // major brand
    dv.setUint32(12, 0x00000200, false); // minor version
    this.writeFourCC(box, 16, 'qt  '); // compatible brand
    return box;
  }

  private createMoovBox(duration: number, totalFrames: number, chunkOffsets: number[]): Uint8Array {
    const mvhd = this.createMvhdBox(duration);
    const trak = this.createTrakBox(duration, totalFrames, chunkOffsets);
    return this.wrapBox('moov', [mvhd, trak]);
  }

  private createMvhdBox(duration: number): Uint8Array {
    const box = new Uint8Array(108);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 108, false);
    this.writeFourCC(box, 4, 'mvhd');
    // version 0 (8), flags 0 (9..11)
    dv.setUint32(12, 0, false); // creation_time
    dv.setUint32(16, 0, false); // modification_time
    dv.setUint32(20, this.timescale, false); // timescale
    dv.setUint32(24, duration, false); // duration
    dv.setUint32(28, 0x00010000, false); // preferred rate 1.0 (fixed 16.16)
    dv.setUint16(32, 0x0100, false); // preferred volume 1.0 (fixed 8.8)
    // 10 reserved bytes (34..43) = 0
    // Matrix structure (44..79) - identity matrix
    dv.setUint32(44, 0x00010000, false); // a = 1.0
    dv.setUint32(60, 0x00010000, false); // d = 1.0
    dv.setUint32(76, 0x40000000, false); // w = 1.0 (fixed 2.30)
    // preview / poster times (80..99) = 0
    dv.setUint32(104, 2, false); // next_track_ID = 2
    return box;
  }

  private createTrakBox(duration: number, totalFrames: number, chunkOffsets: number[]): Uint8Array {
    const tkhd = this.createTkhdBox(duration);
    const mdia = this.createMdiaBox(duration, totalFrames, chunkOffsets);
    return this.wrapBox('trak', [tkhd, mdia]);
  }

  private createTkhdBox(duration: number): Uint8Array {
    const box = new Uint8Array(92);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 92, false);
    this.writeFourCC(box, 4, 'tkhd');
    dv.setUint8(8, 0); // version
    dv.setUint8(9, 0); // flags byte 1
    dv.setUint8(10, 0); // flags byte 2
    dv.setUint8(11, 0x0f); // flags byte 3: TrackEnabled | TrackInMovie | TrackInPreview | TrackInPoster
    dv.setUint32(12, 0, false); // creation_time
    dv.setUint32(16, 0, false); // modification_time
    dv.setUint32(20, 1, false); // track_ID = 1
    dv.setUint32(24, 0, false); // reserved
    dv.setUint32(28, duration, false); // duration
    // 32..39: 8 reserved bytes = 0
    // 40..41: layer = 0
    // 42..43: alternate_group = 0
    // 44..45: volume = 0
    // 46..47: reserved = 0
    // 48..83: matrix structure (36 bytes)
    dv.setUint32(48, 0x00010000, false); // a = 1.0
    dv.setUint32(64, 0x00010000, false); // d = 1.0
    dv.setUint32(80, 0x40000000, false); // w = 1.0 (2.30)
    // 84..91: track dimensions (fixed 16.16)
    dv.setUint32(84, this.width << 16, false);
    dv.setUint32(88, this.height << 16, false);
    return box;
  }

  private createMdiaBox(duration: number, totalFrames: number, chunkOffsets: number[]): Uint8Array {
    const mdhd = this.createMdhdBox(duration);
    const hdlr = this.createHdlrBox();
    const minf = this.createMinfBox(totalFrames, chunkOffsets);
    return this.wrapBox('mdia', [mdhd, hdlr, minf]);
  }

  private createMdhdBox(duration: number): Uint8Array {
    const box = new Uint8Array(32);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 32, false);
    this.writeFourCC(box, 4, 'mdhd');
    dv.setUint32(12, 0, false); // creation_time
    dv.setUint32(16, 0, false); // modification_time
    dv.setUint32(20, this.timescale, false); // timescale
    dv.setUint32(24, duration, false); // duration
    dv.setUint16(28, 0x55c4, false); // language code (und)
    return box;
  }

  private createHdlrBox(): Uint8Array {
    const componentName = 'Apple Video Media Handler';
    const box = new Uint8Array(33 + componentName.length);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, box.length, false);
    this.writeFourCC(box, 4, 'hdlr');
    this.writeFourCC(box, 8, 'mhlr'); // component type
    this.writeFourCC(box, 12, 'vide'); // component subtype
    this.writeFourCC(box, 16, 'appl'); // manufacturer
    // 20..27: component flags = 0
    dv.setUint8(32, componentName.length);
    for (let i = 0; i < componentName.length; i++) {
      box[33 + i] = componentName.charCodeAt(i);
    }
    return box;
  }

  private createMinfBox(totalFrames: number, chunkOffsets: number[]): Uint8Array {
    const vmhd = this.createVmhdBox();
    const dinf = this.createDinfBox();
    const stbl = this.createStblBox(totalFrames, chunkOffsets);
    return this.wrapBox('minf', [vmhd, dinf, stbl]);
  }

  private createVmhdBox(): Uint8Array {
    const box = new Uint8Array(20);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 20, false);
    this.writeFourCC(box, 4, 'vmhd');
    dv.setUint8(11, 1); // flags = 1
    return box;
  }

  private createDinfBox(): Uint8Array {
    const dref = new Uint8Array(28);
    const dv = new DataView(dref.buffer);
    dv.setUint32(0, 28, false);
    this.writeFourCC(dref, 4, 'dref');
    dv.setUint32(12, 1, false); // entry_count = 1
    // url entry
    dv.setUint32(16, 12, false);
    this.writeFourCC(dref, 20, 'url ');
    dv.setUint8(27, 1); // self-contained flag = 1
    return this.wrapBox('dinf', [dref]);
  }

  private createStblBox(totalFrames: number, chunkOffsets: number[]): Uint8Array {
    const stsd = this.createStsdBox();
    const stts = this.createSttsBox(totalFrames);
    const stsc = this.createStscBox(totalFrames);
    const stsz = this.createStszBox(totalFrames);
    const stco = this.createStcoBox(chunkOffsets);
    return this.wrapBox('stbl', [stsd, stts, stsc, stsz, stco]);
  }

  private createStsdBox(): Uint8Array {
    // Visual Sample Description Entry (86 bytes)
    const entry = new Uint8Array(86);
    const edv = new DataView(entry.buffer);
    edv.setUint32(0, 86, false); // entry size
    this.writeFourCC(entry, 4, this.fourcc); // 'rle ', 'png ', or 'raw '
    edv.setUint16(14, 1, false); // data_reference_index = 1
    edv.setUint16(16, 0, false); // version = 0
    edv.setUint16(18, 0, false); // revision level = 0
    this.writeFourCC(entry, 20, 'appl'); // vendor = 'appl'
    edv.setUint32(24, 0x00000200, false); // temporal_quality = 512
    edv.setUint32(28, 0x00000200, false); // spatial_quality = 512
    edv.setUint16(32, this.width, false); // width
    edv.setUint16(34, this.height, false); // height
    edv.setUint32(36, 0x00480000, false); // 72 dpi horiz (fixed 16.16)
    edv.setUint32(40, 0x00480000, false); // 72 dpi vert (fixed 16.16)
    edv.setUint32(44, 0, false); // data_size = 0
    edv.setUint16(48, 1, false); // frame_count = 1

    // Compressor name pascal string: 32 bytes from offset 50 to 81
    const compName = this.fourcc === 'rle ' ? 'Animation' : this.fourcc === 'png ' ? 'PNG' : 'Raw 32-bit';
    entry[50] = Math.min(31, compName.length);
    for (let i = 0; i < Math.min(31, compName.length); i++) {
      entry[51 + i] = compName.charCodeAt(i);
    }

    edv.setUint16(82, 32, false); // depth = 32-bit (32bpp with Alpha channel)
    edv.setInt16(84, -1, false); // color_table_id = -1 (no color table)

    // Wrap in stsd
    const stsd = new Uint8Array(16 + entry.length);
    const sdv = new DataView(stsd.buffer);
    sdv.setUint32(0, stsd.length, false);
    this.writeFourCC(stsd, 4, 'stsd');
    sdv.setUint32(12, 1, false); // entry_count = 1
    stsd.set(entry, 16);
    return stsd;
  }

  private createSttsBox(totalFrames: number): Uint8Array {
    const box = new Uint8Array(24);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 24, false);
    this.writeFourCC(box, 4, 'stts');
    dv.setUint32(12, 1, false); // entry_count = 1
    dv.setUint32(16, totalFrames, false); // sample_count
    dv.setUint32(20, Math.round(this.timescale / this.fps), false); // sample_delta
    return box;
  }

  private createStscBox(totalFrames: number): Uint8Array {
    const box = new Uint8Array(28);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 28, false);
    this.writeFourCC(box, 4, 'stsc');
    dv.setUint32(12, 1, false); // entry_count = 1
    dv.setUint32(16, 1, false); // first_chunk = 1
    dv.setUint32(20, 1, false); // samples_per_chunk = 1
    dv.setUint32(24, 1, false); // sample_description_index = 1
    return box;
  }

  private createStszBox(totalFrames: number): Uint8Array {
    const box = new Uint8Array(20 + totalFrames * 4);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, box.length, false);
    this.writeFourCC(box, 4, 'stsz');
    dv.setUint32(12, 0, false); // sample_size = 0 (variable)
    dv.setUint32(16, totalFrames, false); // sample_count
    for (let i = 0; i < totalFrames; i++) {
      dv.setUint32(20 + i * 4, this.frameSizes[i], false);
    }
    return box;
  }

  private createStcoBox(chunkOffsets: number[]): Uint8Array {
    const totalFrames = chunkOffsets.length;
    const box = new Uint8Array(16 + totalFrames * 4);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, box.length, false);
    this.writeFourCC(box, 4, 'stco');
    dv.setUint32(12, totalFrames, false); // entry_count
    for (let i = 0; i < totalFrames; i++) {
      dv.setUint32(16 + i * 4, chunkOffsets[i], false);
    }
    return box;
  }

  private wrapBox(type: string, children: Uint8Array[]): Uint8Array {
    const payloadSize = children.reduce((a, b) => a + b.length, 0);
    const box = new Uint8Array(8 + payloadSize);
    const dv = new DataView(box.buffer);
    dv.setUint32(0, 8 + payloadSize, false);
    this.writeFourCC(box, 4, type);
    let offset = 8;
    for (let i = 0; i < children.length; i++) {
      box.set(children[i], offset);
      offset += children[i].length;
    }
    return box;
  }

  private writeFourCC(target: Uint8Array, offset: number, fourcc: string) {
    for (let i = 0; i < 4; i++) {
      target[offset + i] = fourcc.charCodeAt(i);
    }
  }
}
