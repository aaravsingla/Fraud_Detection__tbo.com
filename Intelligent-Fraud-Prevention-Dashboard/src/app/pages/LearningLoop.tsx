import { useState } from "react";
import { GraduationCap, ThumbsUp, ThumbsDown, MessageSquare, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { submitOverride } from "../services/riskApi";

interface LearningCase {
  id: string;
  bookingId: string;
  agencyName: string;
  amount: number;
  destination: string;
  aiPrediction: "approve" | "reject";
  aiConfidence: number;
  riskScore: number;
  conflictingAgents: string[];
}

const mockLearningQueue: LearningCase[] = [
  {
    id: "LC-001",
    bookingId: "BK-2026-003",
    agencyName: "SkyHigh Agencies",
    amount: 520000,
    destination: "Singapore",
    aiPrediction: "reject",
    aiConfidence: 67,
    riskScore: 67,
    conflictingAgents: ["Financial Analyzer", "Benchmark Comparator"],
  },
  {
    id: "LC-002",
    bookingId: "BK-2026-005",
    agencyName: "TravelPro Partners",
    amount: 380000,
    destination: "Paris, France",
    aiPrediction: "approve",
    aiConfidence: 58,
    riskScore: 42,
    conflictingAgents: ["Behavioral Monitor"],
  },
];

export function LearningLoop() {
  const [queue, setQueue] = useState(mockLearningQueue);
  const [selectedCase, setSelectedCase] = useState<LearningCase | null>(null);
  const [feedback, setFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  const totalReviewed = 147;
  const accuracyImprovement = 12.3;
  const casesThisWeek = 23;

  const handleDecision = async (caseId: string, decision: "approve" | "reject") => {
    if (!feedback.trim()) {
      toast.error("Please provide reasoning for your decision");
      return;
    }

    setProcessing(true);

    try {
      await submitOverride({
        caseId,
        bookingId: selectedCase?.bookingId,
        label: decision,
        rationale: feedback,
        meta: {
          aiPrediction: selectedCase?.aiPrediction,
          aiConfidence: selectedCase?.aiConfidence,
          riskScore: selectedCase?.riskScore,
          conflictingAgents: selectedCase?.conflictingAgents,
        },
      });

      setQueue((prev) => prev.filter((c) => c.id !== caseId));
      setSelectedCase(null);
      setFeedback("");

      toast.success("Learning data added", {
        description: "Your decision has been recorded and will improve future predictions.",
      });
    } catch (e) {
      toast.error("Failed to submit override", {
        description: String((e as Error)?.message ?? e),
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          Human-AI Learning Loop
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review uncertain cases to improve AI model accuracy
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cases in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#FF6600]">{queue.length}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalReviewed}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{casesThisWeek}</div>
            <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Accuracy Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2E7D32]">+{accuracyImprovement}%</div>
            <p className="text-xs text-gray-500 mt-1">Since launch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Queue List */}
        <div className="col-span-5 space-y-4">
          <h2 className="font-semibold">Review Queue</h2>
          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center">
                <Check className="w-12 h-12 mx-auto text-[#2E7D32] mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-xs text-gray-500 mt-1">
                  No uncertain cases require review at this time
                </p>
              </div>
            ) : (
              queue.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  onClick={() => setSelectedCase(item)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCase?.id === item.id
                      ? "ring-2 ring-[#003366] shadow-md"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{item.agencyName}</h3>
                      <p className="text-xs text-gray-500">ID: {item.bookingId}</p>
                    </div>
                    <Badge
                      variant={item.aiPrediction === "reject" ? "destructive" : "default"}
                      className="text-xs"
                    >
                      AI: {item.aiPrediction}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-semibold ml-1">
                        ₹{(item.amount / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Risk:</span>
                      <span className="font-semibold ml-1">{item.riskScore}%</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">AI Confidence</span>
                      <span className="text-xs font-semibold">{item.aiConfidence}%</span>
                    </div>
                    <Progress
                      value={item.aiConfidence}
                      className="h-1.5 [&>div]:bg-[#FF6600]"
                    />
                  </div>

                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Conflict:</span> {item.conflictingAgents.join(", ")}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="col-span-7">
          <AnimatePresence mode="wait">
            {selectedCase ? (
              <motion.div
                key={selectedCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Case Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Case Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Agency</div>
                        <div className="font-semibold">{selectedCase.agencyName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Booking ID</div>
                        <div className="font-semibold font-mono text-sm">
                          {selectedCase.bookingId}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Amount</div>
                        <div className="font-semibold">
                          ₹{(selectedCase.amount / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Destination</div>
                        <div className="font-semibold">{selectedCase.destination}</div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="text-sm text-gray-500 mb-2">AI Assessment</div>
                      <div className="p-3 bg-gray-50 rounded border-l-4 border-[#FF6600]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">
                            Recommendation:{" "}
                            <span className="capitalize">{selectedCase.aiPrediction}</span>
                          </span>
                          <span className="text-sm">
                            Confidence: {selectedCase.aiConfidence}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Risk Score: {selectedCase.riskScore}% | Conflicting agents:{" "}
                          {selectedCase.conflictingAgents.join(", ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Human Decision */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Your Decision & Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label
                        htmlFor="learning-loop-feedback"
                        className="text-sm font-medium mb-2 block"
                      >
                        Explain your reasoning (required)
                      </label>
                      <Textarea
                        id="learning-loop-feedback"
                        placeholder="Why do you agree or disagree with the AI recommendation? What factors influenced your decision?"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your feedback helps improve the AI model's accuracy
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDecision(selectedCase.id, "approve")}
                        disabled={processing || !feedback.trim()}
                        className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve Booking
                      </Button>
                      <Button
                        onClick={() => handleDecision(selectedCase.id, "reject")}
                        disabled={processing || !feedback.trim()}
                        className="flex-1 bg-[#C62828] hover:bg-[#C62828]/90"
                        variant="destructive"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject Booking
                      </Button>
                    </div>

                    {processing && (
                      <div className="text-center text-sm text-gray-500">
                        Processing your feedback...
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Learning Impact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Learning Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="font-medium mb-1">Model Update</div>
                      <div className="text-gray-600">
                        Your decision will be used to retrain the AI agents, improving future
                        predictions for similar patterns.
                      </div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <div className="font-medium mb-1">Pattern Recognition</div>
                      <div className="text-gray-600">
                        Cases like this help the system learn edge cases and reduce false
                        positives/negatives.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed">
                <div className="text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Select a case to review</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click on any case from the queue to begin
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
