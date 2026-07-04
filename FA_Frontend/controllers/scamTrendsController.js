const pageModel = require("../models/pageModel");

const scamTrendData = {
  totalReports: 21,
  mostCommonScamType: "Phishing",
  mostCommonScamCount: 21,
  highRiskReports: 21,
  mediumRiskReports: 0,
  lowRiskReports: 0,
  trendSummary:
    "Phishing is currently the most reported scam with 21 reports. Total reports analysed: 21. High risk reports: 21, medium risk reports: 0, low risk reports: 0.",
  dateGenerated: "7/4/2026, 5:05:51 AM"
};

exports.showDashboard = (req, res) => {
  const riskBreakdown = [
    {
      label: "High Risk",
      count: scamTrendData.highRiskReports,
      className: "high"
    },
    {
      label: "Medium Risk",
      count: scamTrendData.mediumRiskReports,
      className: "medium"
    },
    {
      label: "Low Risk",
      count: scamTrendData.lowRiskReports,
      className: "low"
    }
  ].map((item) => ({
    ...item,
    percentage: scamTrendData.totalReports
      ? Math.round((item.count / scamTrendData.totalReports) * 100)
      : 0
  }));

  res.render("layout", {
    title: "Scam Trends Dashboard",
    currentPage: "scam-trends",
    page: pageModel.getPage("scamTrends"),
    trends: scamTrendData,
    riskBreakdown,
    body: "pages/scam-trends"
  });
};
