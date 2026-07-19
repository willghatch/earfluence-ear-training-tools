# Earfluence Ear Training Tools

I wrote these tools over the course of a few days, based on a similar but worse command line tool that I wrote previously.

After using an app to learn to recognize scale degrees, I hit a plateau when I could reliably recognize the notes of the major scale, but not fast enough to recognize notes in real music without stopping to think about the notes. I wrote the “play a random note, rest” loop to push myself and ratchet my recognition speed faster than what was reasonably possible in the other app. It had a nice side effect of making me also practice reproducing the note on an instrument rather than the app UI. I wanted to make a slightly better version that I could share with people who don't use the command line. So I made this as a quick hobby project.

Try the tools out where I host them on [my web site](https://willghatch.net/earfluence/).

Check out the code hosted on [Github](https://github.com/willghatch/earfluence-ear-training-tools).

## Building

The web app lives in `web/` and is static; deploy it by copying `dist/` to a
web server. The Android app in `android/` is a thin WebView wrapper around the
same files, with one launcher icon per tool so that several tools can play
audio at the same time.

```
make dist        # static site into dist/
make apk-debug   # dist -> android assets -> debug APK
make clean
```

Dependencies are not checked in. `make` fetches them against the pinned
versions and hashes in `web/deps.txt` and `android/deps.txt`, and builds
Tone.js from the `third_party/tone.js` submodule, so a first build needs
network, node, a JDK, and the Android SDK. Later builds are offline.

Clone with `--recurse-submodules`, or run `git submodule update --init`.

