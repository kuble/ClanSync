"""Render real QA browser recordings with Korean narration and burned captions."""
import argparse
import json
import math
from pathlib import Path
import re
import subprocess
import textwrap
import wave
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--output', default='test-results/clansync-demo-2026-09-30')
parser.add_argument('--ffmpeg', required=True)
parser.add_argument('--preview', type=int, default=0)
args = parser.parse_args()
out = Path(args.output).resolve()
ffmpeg = str(Path(args.ffmpeg).resolve())
scenes = json.loads((Path(__file__).parent / 'scenes.json').read_text(encoding='utf-8'))
if args.preview:
    scenes = scenes[:args.preview]
shots = {}
for file in sorted(out.glob('recording-*.json')):
    for shot in json.loads(file.read_text(encoding='utf-8')):
        shots[shot['id']] = shot
missing = [s['id'] for s in scenes if s['id'] not in shots]
if missing:
    raise SystemExit(f'Missing recorded scenes: {missing}')
edit = out / 'edit'
edit.mkdir(exist_ok=True)
font = 'C:/Windows/Fonts/malgun.ttf'
bold = 'C:/Windows/Fonts/malgunbd.ttf'
font_brand = ImageFont.truetype(bold, 27)
font_title = ImageFont.truetype(font, 26)
font_small = ImageFont.truetype(font, 20)
ass_header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Malgun Gothic,31,&H00FFFFFF,&H00FFFFFF,&H00101718,&H00101718,0,0,0,0,100,100,0,0,1,1,0,2,80,80,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def stamp(seconds, ass=False):
    n = max(0, round(seconds * (100 if ass else 1000)))
    scale = 100 if ass else 1000
    hours, n = divmod(n, 3600 * scale)
    minutes, n = divmod(n, 60 * scale)
    secs, fraction = divmod(n, scale)
    return f'{hours:d}:{minutes:02d}:{secs:02d}.{fraction:02d}' if ass else f'{hours:02d}:{minutes:02d}:{secs:02d},{fraction:03d}'

subtitles = []
chapters = [';FFMETADATA1']
clock = 0
video_parts = []
for i, spec in enumerate(scenes):
    shot = shots[spec['id']]
    wav = out / 'voice' / f"{spec['id']}.wav"
    with wave.open(str(wav)) as voice:
        voice_duration = voice.getnframes() / voice.getframerate()
    duration = math.ceil(max(shot['end'] - shot['start'], voice_duration + 1.8) * 30) / 30
    header = Image.new('RGB', (1920, 64), '#101719')
    draw = ImageDraw.Draw(header)
    draw.text((30, 14), 'ClanSync', font=font_brand, fill='#72e7b8')
    draw.line((194, 18, 194, 47), fill='#384a44', width=2)
    draw.text((216, 17), spec['title'], font=font_title, fill='#f3f7f6')
    draw.text((1550, 23), f"{spec['chapter']}  |  QA 시연", font=font_small, fill='#aabbb4')
    header.save(edit / f'{i:02d}-header.png')
    sentences = re.split(r'(?<=[.!?])\s+', spec['narration'].strip())
    units = [max(1, len(sentence)) + 5 for sentence in sentences]
    t = 0.65
    events = []
    for sentence, weight in zip(sentences, units):
        end = t + voice_duration * weight / sum(units)
        lines = textwrap.wrap(sentence, width=47, break_long_words=True, break_on_hyphens=False)
        text = r'\N'.join(lines)
        events.append(f'Dialogue: 0,{stamp(t, True)},{stamp(end, True)},Default,,0,0,0,,{text}')
        subtitles.append((clock+t, clock+end, '\n'.join(lines)))
        t = end
    ass_path = edit / f'{i:02d}.ass'
    ass_path.write_text(ass_header + '\n'.join(events) + '\n', encoding='utf-8-sig')
    clip = edit / f'{i:02d}.mp4'
    filters = (f'[0:v]fps=30,scale=1920:912:flags=lanczos,pad=1920:1080:0:64:color=0x101719,'
               f'tpad=stop_mode=clone:stop_duration=3[screen];'
               f'[screen][2:v]overlay=0:0:repeatlast=1,ass={i:02d}.ass[v];'
               f'[1:a]adelay=650,apad,alimiter=limit=0.95[a]')
    command = [ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(shot['start']),'-t',str(duration),
               '-i',shot['video'],'-i',str(wav),'-i',f'{i:02d}-header.png','-filter_complex',filters,
               '-map','[v]','-map','[a]','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','20',
               '-pix_fmt','yuv420p','-threads','4','-c:a','aac','-b:a','160k','-ar','48000','-ac','2',
               '-movflags','+faststart',str(clip)]
    # A finished scene may be reused after a later scene failed during recording.
    if not clip.exists() or clip.stat().st_mtime < max(wav.stat().st_mtime,Path(shot['video']).stat().st_mtime):
        subprocess.run(command,cwd=edit,check=True)
    video_parts.append(f"file '{clip.name}'")
    chapters += ['[CHAPTER]','TIMEBASE=1/1000',f'START={round(clock*1000)}',f'END={round((clock+duration)*1000)}',f"title={spec['title']}"]
    clock += duration
    print(f'RENDER {i+1}/{len(scenes)} {spec["id"]}: {duration:.1f}s',flush=True)
(edit/'concat.txt').write_text('\n'.join(video_parts),encoding='utf-8')
(edit/'chapters.txt').write_text('\n'.join(chapters),encoding='utf-8')
destination = out / ('preview.mp4' if args.preview else 'ClanSync-실제시연-한국어.mp4')
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i','concat.txt',
                '-i','chapters.txt','-map_metadata','1','-map_chapters','1','-c:v','copy',
                '-c:a','aac','-b:a','160k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=11',
                '-movflags','+faststart',str(destination)],cwd=edit,check=True)
srt = '\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}' for i,(a,b,text) in enumerate(subtitles))+'\n'
(out/'ClanSync-한국어자막.srt').write_text(srt,encoding='utf-8-sig')
(out/'render-summary.json').write_text(json.dumps({'seconds':clock,'scenes':len(scenes),'resolution':'1920x1080','fps':30,
  'bytes':destination.stat().st_size,'video':str(destination),'syntheticVoice':'Microsoft Heami Desktop'},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'COMPLETE {clock:.1f}s, {destination.stat().st_size/1024/1024:.1f} MiB',flush=True)
