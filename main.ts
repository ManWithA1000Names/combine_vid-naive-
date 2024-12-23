import {extname} from "node:path";

function insert_before_extension(path: string, insertion: string): string {
  const ext = extname(path);
  return path.slice(0,path.length-ext.length)
         + insertion
         + ext;
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
      console.log('processing file:', opt.file);
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
    stderr: "null",
  });
  console.log('processing file:', opt.file);
  await cmd.spawn().status;
  return filename;
}

async function main(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error('Expected arguments none found.');
    return;
  }

  const decoder = new TextDecoder();
  const options = (await Promise.all(args.map(async (file) => {
    return JSON.parse(decoder.decode(await Deno.readFile(file)));
  }))).flat();

  // each arg is: file;starttime;endtime;
  // with both start time and end time being optional.
  const contents = (await Promise.all(options.map(trim_file))).map((file) =>{
      const absPath = Deno.realPathSync(file).replace(/\\/g, '/');
      return `file '${absPath}'`;
  }).join('\n');

  console.log(contents);
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
