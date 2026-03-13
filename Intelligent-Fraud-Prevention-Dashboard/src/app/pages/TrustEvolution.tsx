import { useState, useMemo } from "react";
import { mockTrustScoreData, mockBookings } from "../data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { TrendingDown, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function TrustEvolution() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");

  const agencies = [
    { id: "AG-001", name: "Wanderlust Travels" },
    { id: "AG-002", name: "Global Ventures" },
    { id: "AG-003", name: "SkyHigh Agencies" },
    { id: "AG-004", name: "Paradise Tours" },
  ];

  // Generate different trajectories based on the selected agency
  const currentAgencyData = useMemo(() => {
    if (selectedAgency === "AG-001") return mockTrustScoreData; // Original bust-out data
    
    return mockTrustScoreData.map((point, index) => {
      let newScore = point.score;
      let newEvent = undefined;

      if (selectedAgency === "AG-002") { // Global Ventures - Stable & High
        newScore = 90 + (index % 4);
      } else if (selectedAgency === "AG-003") { // SkyHigh - Medium risk, slight drop
        newScore = 75 - (index % 3) * 2;
        if (index === 8) newEvent = "Destination anomaly detected";
      } else if (selectedAgency === "AG-004") { // Paradise Tours - Perfect trust
        newScore = 95 + (index % 3);
      }

      return { ...point, score: newScore, event: newEvent };
    });
  }, [selectedAgency]);

  const chartData = currentAgencyData.map((point) => ({
    date: point.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: point.score,
    event: point.event,
    fullDate: point.date,
  }));

  const currentScore = chartData[chartData.length - 1].score;
  const startScore = chartData[0].score;
  const change = currentScore - startScore;
  const changePercent = ((change / startScore) * 100).toFixed(1);

  const eventPoints = chartData.filter((d) => d.event);

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366]">Trust Score Evolution</h1>
          <p className="text-sm text-gray-500 mt-1">
            90-day trust trajectory with behavioral event tracking
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Current Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentScore < 50 ? "text-[#C62828]" : currentScore < 75 ? "text-[#F57C00]" : "text-[#2E7D32]"}`}>
              {currentScore}
            </div>
            <p className="text-xs text-gray-500 mt-1">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">90-Day Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {change < 0 ? (
                <TrendingDown className="w-5 h-5 text-[#C62828]" />
              ) : (
                <TrendingUp className="w-5 h-5 text-[#2E7D32]" />
              )}
              <div className={`text-3xl font-bold ${change < 0 ? "text-[#C62828]" : "text-[#2E7D32]"}`}>
                {change > 0 ? "+" : ""}{change}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.abs(parseFloat(changePercent))}% {change < 0 ? "decline" : "increase"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{eventPoints.length}</div>
            <p className="text-xs text-gray-500 mt-1">Flagged incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trend Direction</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={change < 0 ? "destructive" : "default"} 
              className={`text-sm ${change >= 0 ? "bg-[#2E7D32] hover:bg-[#2E7D32]/90" : ""}`}
            >
              {change < 0 ? "Declining" : "Stable"}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">
              {change < 0 ? "Requires attention" : "Normal behavior"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trust Score Chart */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Trust Score Timeline</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Last 90 days</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#003366" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <ReferenceLine y={70} stroke="#F57C00" strokeDasharray="3 3" label="Warning Threshold" />
            <ReferenceLine y={40} stroke="#C62828" strokeDasharray="3 3" label="Critical Threshold" />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#003366"
              strokeWidth={3}
              fill="url(#scoreGradient)"
            />
            {eventPoints.map((point, index) => (
              <ReferenceLine
                key={index}
                x={point.date}
                stroke="#FF6600"
                strokeWidth={2}
                label={{
                  value: "⚠",
                  position: "top",
                  fill: "#FF6600",
                  fontSize: 16,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Behavioral Events */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Annotated Behavioral Events
        </h2>
        {eventPoints.length > 0 ? (
          <div className="space-y-3">
            {eventPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border-l-4 border-[#FF6600] bg-orange-50 rounded"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#FF6600] rounded-lg flex items-center justify-center text-white font-bold">
                    {point.score}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{point.event}</h3>
                    <span className="text-xs text-gray-500">
                      {point.fullDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Trust score dropped to {point.score}. This event triggered enhanced monitoring
                    and contributed to the overall declining trend.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No significant behavioral anomalies detected in the last 90 days.</p>
        )}
      </div>
    </div>
  );
}