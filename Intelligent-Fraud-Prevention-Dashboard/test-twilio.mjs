// Test our ACTUAL webhook (press-1 verification flow)
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_PHONE_NUMBER;
const baseUrl = process.env.TWILIO_BASE_URL;
const to = "+918229058945";
const auth = "Basic " + Buffer.from(sid + ":" + token).toString("base64");

const voiceUrl = `${baseUrl}/api/twilio/voice?vid=test-press1`;
console.log("Webhook URL:", voiceUrl);

const body = new URLSearchParams({ To: to, From: from, Url: voiceUrl });

const res = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
  {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  }
);
const data = await res.json();
console.log("Status:", res.status, "SID:", data.sid, "Call status:", data.status);
console.log("\nINSTRUCTIONS:");
console.log("1. Answer the call");
console.log("2. Listen to trial message");
console.log("3. Press ANY key when it says 'press any key to execute your code'");
console.log("4. You should then hear our verification prompt!");
console.log("5. Press 1 to confirm identity");
