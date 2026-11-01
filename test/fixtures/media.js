// The artifact viewer's media fixtures, for its specimen page and its browser tier: each a Blob,
// built fresh for each call, small enough to keep in source. The static server serves only .html,
// .js, and .css, so the bytes are here, as base64, rather than in files of their own types.
// summary.pdf, 549 B: one 300 x 200 pt page reading "Run summary" in Helvetica. chart.png, 167 B:
// a 160 x 90 bar chart. clip.webm, 567 B: one second of a 64 x 36 VP9 clip in one color, no audio
// track. silence.wav is built, not stored: a quarter second of 8 kHz, 8-bit mono silence, 2,044 B.

/** Bytes from base64. */
const bytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** A one-page PDF, application/pdf. */
export const pdf = () =>
  new Blob(
    [
      bytes(
        "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeX" +
          "BlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIg" +
          "MCBSL01lZGlhQm94WzAgMCAzMDAgMjAwXS9Db250ZW50cyA0IDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNSAwIF" +
          "I+Pj4+Pj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQyPj5zdHJlYW0KQlQgL0YxIDI0IFRmIDQwIDEwMCBUZCAo" +
          "UnVuIHN1bW1hcnkpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeX" +
          "BlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAw" +
          "MDA5IDAwMDAwIG4gCjAwMDAwMDAwNTQgMDAwMDAgbiAKMDAwMDAwMDEwNSAwMDAwMCBuIAowMDAwMDAwMjE3IDAwMD" +
          "AwIG4gCjAwMDAwMDAzMDYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoz" +
          "NjkKJSVFT0YK",
      ),
    ],
    { type: "application/pdf" },
  );

/** A 160 x 90 PNG, image/png. */
export const png = () =>
  new Blob(
    [
      bytes(
        "iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAMAAAAIGK1gAAAACVBMVEUrb4/goDD07+ZAWNJlAAAAWUlEQVRo3u3OwQ" +
          "0AIAgAMXT/oZlAYuJDSHoLXCMkSZJUtE4BAgICAgICAgKOBt6OAQEBAQEBAQEBAQEBf44BAQEBAQEBAQEBAQEBAQEB" +
          "AQEB+7abB/gMlFSXU4kSTjZ4AtoAAAAASUVORK5CYII=",
      ),
    ],
    { type: "image/png" },
  );

/** A one-second 64 x 36 WebM, video/webm. */
export const webm = () =>
  new Blob(
    [
      bytes(
        "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIHEU2bdLpNu4tTq4QVSalmU6yBoU" +
          "27i1OrhBZUrmtTrIHGTbuMU6uEElTDZ1OsggEiTbuMU6uEHFO7a1OsggHx7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAA" +
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
          "AAAAAAAAAVSalmoCrXsYMPQkBNgIRMYXZmV0GETGF2ZkSJiECPQAAAAAAAFlSua9euAQAAAAAAAE7XgQFzxYgAAAAA" +
          "AAAAAZyBACK1nIN1bmSIgQCGhVZfVlA5g4EBI+ODhA7msoDgkLCBQLqBJJqBAlWwhFW5gQFV7oEA7AEAAAAAAAACAA" +
          "ASVMNn1HNz0WPAi2PFiAAAAAAAAAABZ8icRaOHRU5DT0RFUkSHj0xhdmMgbGlidnB4LXZwOWfIoUWjiERVUkFUSU9O" +
          "RIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnXx54EAo62BAACAgkmDQgAD8AI2ADgkHBhCAAAwYAAAE7//5u2AAR////" +
          "5+sf////2NEACjk4EA+gCGAECSnABJQAADIAAAVHCjk4EB9ACGAECSnABKwAADIAAAVHCjk4EC7gCGAECSnABJwAAD" +
          "IAAAVHAcU7trkbuPs4EAt4r3gQHxggF78IED",
      ),
    ],
    { type: "video/webm" },
  );

/** A quarter second of silence, audio/wav: a RIFF header over 2,000 unsigned 8-bit samples at
 * their midpoint, 128. */
export const wav = () => {
  const samples = 2000;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const ascii = (at, text) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true); // the fmt chunk's size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, 8000, true); // samples a second
  view.setUint32(28, 8000, true); // bytes a second
  view.setUint16(32, 1, true); // bytes a frame
  view.setUint16(34, 8, true); // bits a sample
  ascii(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
  return new Blob([view], { type: "audio/wav" });
};
