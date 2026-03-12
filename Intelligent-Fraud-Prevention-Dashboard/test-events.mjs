// Check call events
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const callSid = "CA4d27884abdf3bd89a4e7875f86d0d54b";

const res = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}/Events.json`,
  { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` } }
);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
