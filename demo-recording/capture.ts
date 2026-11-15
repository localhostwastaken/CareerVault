// Records the browser window's region of the main display with ffmpeg (avfoundation) and
// encodes it at 1920×1080. macOS asks once for Screen Recording permission for the terminal.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { WINDOW } from './config.js'

function screenDeviceIndex(): string {
  let listing = ''
  try {
    execFileSync('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''], { stdio: 'pipe' })
  } catch (error) {
    // ffmpeg exits non-zero after listing; the list is on stderr.
    listing = String((error as { stderr?: Buffer }).stderr ?? '')
  }
  const match = listing.match(/\[(\d+)\] Capture screen 0/)
  if (!match) throw new Error('No "Capture screen 0" device; grant Screen Recording permission to the terminal')
  return match[1]
}

// Points → pixels: the capture is at the framebuffer size, which on a scaled Retina mode
// is not a clean 2× of the reported resolution, so measure it from the desktop bounds.
function pixelsPerPoint(device: string): number {
  const probe = execFileSync(
    'sh',
    ['-c', `ffmpeg -loglevel error -f avfoundation -framerate 30 -i "${device}:none" -frames:v 1 -f image2pipe -vcodec png - | ffprobe -loglevel error -show_entries stream=width -of csv=p=0 -`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const framebufferWidth = Number(String(probe).trim())
  const bounds = execFileSync('osascript', ['-e', 'tell application "Finder" to get bounds of window of desktop'])
  const pointsWidth = Number(String(bounds).split(',')[2])
  return framebufferWidth / pointsWidth
}

export interface Capture {
  stop(): Promise<void>
}

export function startCapture(outFile: string): Capture {
  const device = screenDeviceIndex()
  const scale = pixelsPerPoint(device)
  const px = (n: number) => Math.round((n * scale) / 2) * 2
  const crop = `crop=${px(WINDOW.width)}:${px(WINDOW.height)}:${px(WINDOW.x)}:${px(WINDOW.y)}`
  const ffmpeg: ChildProcess = spawn(
    'ffmpeg',
    [
      '-loglevel', 'error', '-y',
      '-f', 'avfoundation', '-capture_cursor', '1', '-framerate', '30', '-i', `${device}:none`,
      '-vf', `${crop},scale=1920:1080:flags=lanczos`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
      outFile,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  return {
    // "q" on stdin makes ffmpeg finish the file properly (moov atom written).
    stop: () =>
      new Promise((resolve) => {
        ffmpeg.once('exit', () => resolve())
        ffmpeg.stdin?.write('q')
      }),
  }
}
