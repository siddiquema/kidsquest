"""Make all KidQuest voice clips with a Microsoft neural voice (edge-tts).

Reads the tables in audio/SCRIPTS.md and the story texts in audio/scripts/stories/,
and writes MP3s to audio/phrases/ and audio/stories/. Files that already exist are
skipped, so a hand-made recording (e.g. from Speechello) is never overwritten.

  python -m pip install --user edge-tts
  python tools/make_audio.py --voice en-GB-SoniaNeural
  python tools/make_audio.py --voice en-GB-SoniaNeural --only stories --force
  python tools/make_audio.py --list            # show what would be made
"""
import argparse, asyncio, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIO = ROOT / 'audio'
ROW = re.compile(r'^\|\s*([a-z0-9-]+\.mp3)\s*\|\s*(.+?)\s*\|\s*$')


def jobs():
    """(kind, out path, text) for every clip in SCRIPTS.md."""
    out = []
    for line in (AUDIO / 'SCRIPTS.md').read_text(encoding='utf-8').splitlines():
        m = ROW.match(line)
        if not m:
            continue
        name, say = m.groups()
        if say.startswith('scripts\\stories\\') or say.startswith('scripts/stories/'):
            src = AUDIO / say.replace('\\', '/')
            out.append(('stories', AUDIO / 'stories' / name, src.read_text(encoding='utf-8')))
        else:
            out.append(('phrases', AUDIO / 'phrases' / name, say))
    return out


async def make(text, path, voice, rate):
    import edge_tts
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(path))
            return
        except Exception as e:  # the service sometimes drops a connection; try again
            if attempt == 2:
                raise
            print(f'   retrying ({e})')
            await asyncio.sleep(2)


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--voice', default='en-GB-SoniaNeural')
    ap.add_argument('--phrase-rate', default='-5%', help='speed for short phrases, e.g. -5%%')
    ap.add_argument('--story-rate', default='-10%', help='speed for stories (a little slower)')
    ap.add_argument('--only', choices=['phrases', 'stories'])
    ap.add_argument('--match', help='only files whose name contains this, e.g. meal-')
    ap.add_argument('--force', action='store_true', help='remake files that already exist')
    ap.add_argument('--list', action='store_true', help='show the clips and stop')
    a = ap.parse_args()

    todo = [j for j in jobs() if (not a.only or j[0] == a.only) and (not a.match or a.match in j[1].name)]
    if a.list:
        for kind, path, text in todo:
            print(f'{path.relative_to(AUDIO)}  {text[:60]!r}')
        print(f'{len(todo)} clips')
        return

    made = skipped = 0
    for kind, path, text in todo:
        if path.exists() and not a.force:
            skipped += 1
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f'-> {path.relative_to(AUDIO)}')
        await make(text, path, a.voice, a.story_rate if kind == 'stories' else a.phrase_rate)
        made += 1
    print(f'Done: {made} made, {skipped} already there (use --force to remake).')


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(1)
