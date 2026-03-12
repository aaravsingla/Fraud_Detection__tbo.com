import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, Phone, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { cn } from "./ui/utils";
import {
  requestEmailOTP,
  requestIVRCall,
  verifyCode,
  fetchVerificationStatus,
} from "../services/riskApi";

interface StepUpVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  defaultEmail?: string;
  defaultPhone?: string;
  onVerified?: () => void;
}

type Phase = "idle" | "sending" | "input" | "verifying" | "success" | "failed";
type IVRPhase = "idle" | "initiating" | "ringing" | "in_progress" | "verified" | "failed" | "no_answer";

export function StepUpVerificationModal({
  open,
  onOpenChange,
  bookingId,
  defaultEmail = "",
  defaultPhone = "",
  onVerified,
}: StepUpVerificationModalProps) {
  // Email OTP state
  const [email, setEmail] = useState(defaultEmail);
  const [otpCode, setOtpCode] = useState("");
  const [emailPhase, setEmailPhase] = useState<Phase>("idle");
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // IVR state
  const [phone, setPhone] = useState(defaultPhone);
  const [ivrPhase, setIvrPhase] = useState<IVRPhase>("idle");
  const [ivrError, setIvrError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c: number) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Clean up IVR polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSendOTP = useCallback(async () => {
    if (!email) return;
    setEmailPhase("sending");
    setEmailError("");
    try {
      const res = await requestEmailOTP({ bookingId, email });
      setEmailVerificationId(res.verificationId);
      setEmailPhase("input");
      setCountdown(60);
    } catch {
      setEmailError("Failed to send OTP. Please try again.");
      setEmailPhase("idle");
    }
  }, [bookingId, email]);

  const handleVerifyOTP = useCallback(async () => {
    if (!emailVerificationId || otpCode.length !== 6) return;
    setEmailPhase("verifying");
    setEmailError("");
    try {
      const res = await verifyCode({ verificationId: emailVerificationId, code: otpCode });
      if (res.verified) {
        setEmailPhase("success");
        onVerified?.();
      } else {
        setEmailError(res.error || "Invalid code. Please try again.");
        setEmailPhase("input");
        setOtpCode("");
      }
    } catch {
      setEmailError("Verification failed. Please try again.");
      setEmailPhase("input");
      setOtpCode("");
    }
  }, [emailVerificationId, otpCode, onVerified]);

  const handleRequestIVR = useCallback(async () => {
    if (!phone) return;
    setIvrPhase("initiating");
    setIvrError("");
    try {
      const res = await requestIVRCall({ bookingId, phone });
      setIvrPhase("ringing");

      // Poll for status
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await fetchVerificationStatus(res.verificationId);
          if (status.status === "verified") {
            setIvrPhase("verified");
            if (pollRef.current) clearInterval(pollRef.current);
            onVerified?.();
          } else if (status.status === "failed") {
            setIvrPhase("failed");
            setIvrError("Verification call failed.");
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (status.status === "expired") {
            setIvrPhase("no_answer");
            setIvrError("No answer. Call timed out.");
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (status.status === "sent") {
            setIvrPhase("in_progress");
          }
        } catch {
          // Silently retry on network hiccup
        }
      }, 3000);
    } catch {
      setIvrError("Failed to initiate call. Please try again.");
      setIvrPhase("idle");
    }
  }, [bookingId, phone, onVerified]);

  const resetState = useCallback(() => {
    setEmailPhase("idle");
    setOtpCode("");
    setEmailVerificationId(null);
    setEmailError("");
    setCountdown(0);
    setIvrPhase("idle");
    setIvrError("");
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Step-Up Verification</DialogTitle>
          <DialogDescription>
            Verify the identity for booking {bookingId} using email OTP or phone
            call.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1">
              <Mail className="w-4 h-4 mr-1.5" />
              Email OTP
            </TabsTrigger>
            <TabsTrigger value="ivr" className="flex-1">
              <Phone className="w-4 h-4 mr-1.5" />
              Phone Call
            </TabsTrigger>
          </TabsList>

          {/* ── Email OTP Tab ── */}
          <TabsContent value="email" className="space-y-4 pt-4">
            {emailPhase === "success" ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="font-semibold text-green-700">
                  Identity Verified
                </p>
                <p className="text-sm text-gray-500">
                  Email OTP verified successfully.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Email Address
                  </span>
                  <Input
                    type="email"
                    placeholder="agent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailPhase !== "idle"}
                  />
                </div>

                {emailPhase === "idle" && (
                  <Button
                    className="w-full"
                    onClick={handleSendOTP}
                    disabled={!email}
                  >
                    <Mail className="w-4 h-4 mr-1.5" />
                    Send OTP
                  </Button>
                )}

                {emailPhase === "sending" && (
                  <Button className="w-full" disabled>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Sending...
                  </Button>
                )}

                {(emailPhase === "input" || emailPhase === "verifying") && (
                  <div className="space-y-3">
                    <span className="text-xs font-medium text-gray-600 block">
                      Enter 6-digit code
                    </span>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={setOtpCode}
                        disabled={emailPhase === "verifying"}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleVerifyOTP}
                      disabled={otpCode.length !== 6 || emailPhase === "verifying"}
                    >
                      {emailPhase === "verifying" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>

                    <div className="text-center">
                      {countdown > 0 ? (
                        <span className="text-xs text-gray-400">
                          Resend in {countdown}s
                        </span>
                      ) : (
                        <button
                          onClick={handleSendOTP}
                          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {emailError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </p>
                )}
              </>
            )}
          </TabsContent>

          {/* ── IVR Phone Call Tab ── */}
          <TabsContent value="ivr" className="space-y-4 pt-4">
            {ivrPhase === "verified" ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="font-semibold text-green-700">
                  Identity Verified
                </p>
                <p className="text-sm text-gray-500">
                  Phone verification completed.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Phone Number
                  </span>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={ivrPhase !== "idle" && ivrPhase !== "failed" && ivrPhase !== "no_answer"}
                  />
                </div>

                {(ivrPhase === "idle" || ivrPhase === "failed" || ivrPhase === "no_answer") && (
                  <Button
                    className="w-full"
                    onClick={handleRequestIVR}
                    disabled={!phone}
                  >
                    <Phone className="w-4 h-4 mr-1.5" />
                    {ivrPhase === "idle" ? "Initiate Call" : "Retry Call"}
                  </Button>
                )}

                {(ivrPhase === "initiating" ||
                  ivrPhase === "ringing" ||
                  ivrPhase === "in_progress") && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                      <Phone
                        className={cn(
                          "w-10 h-10",
                          ivrPhase === "ringing"
                            ? "text-amber-500 animate-pulse"
                            : ivrPhase === "in_progress"
                            ? "text-blue-500"
                            : "text-gray-400"
                        )}
                      />
                      {ivrPhase === "initiating" && (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {ivrPhase === "initiating" && "Initiating call..."}
                      {ivrPhase === "ringing" && "Ringing..."}
                      {ivrPhase === "in_progress" && "Call in progress — awaiting DTMF input"}
                    </p>
                    <p className="text-xs text-gray-400">
                      The recipient will be asked to press 1 to confirm
                      they requested this verification.
                    </p>
                  </div>
                )}

                {ivrError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {ivrError}
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
