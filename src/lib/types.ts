export type Role = "hr" | "tp" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type PostingStatus = "open" | "camp_scheduled" | "closed";
export type CampType = "camp" | "visit";
export type CampStatus = "proposed" | "confirmed" | "completed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_primary: boolean;
  phone: string | null;
  alternate_email: string | null;
  profile_photo_path: string | null;
  resume_path: string | null;
  gender: "female" | "male" | "non_binary" | "prefer_not_to_say" | null;
  designation: string | null;
  department: string | null;
  linkedin_url: string | null;
  hiring_authority: string | null;
  office_location: string | null;
  office_phone: string | null;
  programs_branches: string | null;
  college_id: string | null;
  company_id: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface College {
  id: string;
  name: string;
  domain: string;
  city: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface Posting {
  id: string;
  company_id: string;
  created_by: string;
  role_title: string;
  branches: string[];
  num_openings: number;
  target_start: string;
  target_end: string;
  description: string | null;
  status: PostingStatus;
  created_at: string;
}

export interface InterestReport {
  id: string;
  posting_id: string;
  college_id: string;
  reported_by: string;
  interested_count: number;
  eligible_count: number;
  updated_at: string;
}

export interface JobResume {
  id: string;
  posting_id: string;
  college_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export interface Message {
  id: string;
  posting_id: string;
  college_id: string;
  company_id: string;
  sender_id: string;
  sender_role: "hr" | "tp";
  body: string;
  created_at: string;
}

export interface CampVisit {
  id: string;
  posting_id: string;
  college_id: string;
  company_id: string;
  type: CampType;
  scheduled_date: string;
  status: CampStatus;
  created_by: string;
  created_at: string;
}
