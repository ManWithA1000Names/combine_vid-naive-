import {extname} from "node:path";

let debug = false;

function insert_before_extension(path: string, insertion: string): string {
  const ext = extname(path);
  return path.slice(0,path.length-ext.length)
         + insertion
         + ext;
}

function chunkArray<T>(array: T[], chunkSize: number = 5): T[][] {
  const result: T[][] = [];
  
  // Loop through the original array and chunk it into smaller arrays
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}

/**
 * Trims the file returning the new outputted file name.
 *
 * @returns string
 */
async function trim_file(opt: {file: string, start?: string, end?: string}): Promise<string> {
  let args = [
    "-y",
    "-i", opt.file,
  ];

  let insertion = '_trimmed';
  if (opt.start?.length) {
    args.push('-ss', opt.start);
    insertion += '_' + opt.start;
  }

  if (opt.end?.length) {
    args.push("-to", opt.end);
    insertion += '_' + opt.end;
  }

  const filename: string = insert_before_extension(opt.file, insertion);
  try {
    if ((await Deno.stat(filename)).isFile) {
      console.log('processed file:', opt.file);
      return filename;
    }
  } catch {
    // nothing
  }

  args = args.concat(
    [
      "-vf", "scale=1280x720",
      "-r", "30",
      "-preset", "fast",
      "-c:v", "h264_nvenc",
      '-c:a', "aac",
      "-b:a" , "192k",
      "-ar", "44100",
      "-ac", "2",
      filename,
    ]
  )

  const cmd = new Deno.Command('ffmpeg', {
    args,
    stdout: "null",
    stderr: debug ? "inherit" : "null",
  });
  console.log('processing file:', opt.file);
  const status = await cmd.spawn().status;
  if (!status.success) {
    throw new Error(`Failed to process file: ${opt.file}`);
  }
  return filename;
}

async function main(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error('Expected arguments none found.');
    return;
  }

  debug = args.includes('-d') || args.includes('--debug');

  const decoder = new TextDecoder();
  const options = (await Promise.all(args.map(async (file) => {
    if (file.startsWith('-')) return [];
    return JSON.parse(decoder.decode(await Deno.readFile(file)));
  }))).flat();


  const chunked_options = chunkArray(options);

  const contents_array = [];
  for (const chunk of chunked_options) {
    const files = await Promise.all(chunk.map(trim_file));
    contents_array.push(...files.map((file) => {
      const absPath = Deno.realPathSync(file).replace(/\\/g, '/');
      return `file '${absPath}'`;
    }))
  }

  const contents = contents_array.join('\n');

  await Deno.writeTextFile('temp_ffmpeg_input.txt', contents);
  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", 'temp_ffmpeg_input.txt',
      "-c", "copy",
      "output.mp4",
    ],
  });

  const process = cmd.spawn();
  await process.status
  await Deno.remove('temp_ffmpeg_input.txt');
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  main(Deno.args);
}
