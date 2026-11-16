export const CLIENT_STATUSES = ["Lead", "Contacted", "Proposal Sent", "Closed", "Delivered", "Lost"] as const;
/** Client statuses that can have projects (deal closed, or work delivered). */
export const PROJECT_CLIENT_STATUSES = ["Closed", "Delivered"];
export const LEAD_SOURCES = ["Referral", "LinkedIn", "Website", "Cold Outreach", "Other"] as const;
export const PROJECT_STATUSES = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"] as const;
export const PRIORITIES = ["High", "Medium", "Low"] as const;
export const PAYMENT_MODES = ["UPI", "Bank Transfer", "Cash", "Card", "Cheque", "Other"] as const;
export const TIMELINE_TAGS = ["Overdue", "Should Have Started", "Due Soon", "Start Soon"] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type TimelineTag = (typeof TIMELINE_TAGS)[number];

/** Notion-style pill colours */
export type Tone = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";

export const TONE: Record<string, Tone> = {
  // client status
  Lead: "gray",
  Contacted: "blue",
  "Proposal Sent": "yellow",
  Closed: "green",
  Delivered: "purple",
  Lost: "red",
  // project status
  "Not Started": "gray",
  "In Progress": "blue",
  "On Hold": "yellow",
  Completed: "green",
  Cancelled: "red",
  // timeline
  Overdue: "red",
  "Should Have Started": "orange",
  "Due Soon": "yellow",
  "Start Soon": "blue",
  // priority
  High: "red",
  Medium: "yellow",
  Low: "gray",
  // misc
  "Follow up": "orange",
};
