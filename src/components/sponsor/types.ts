export interface ReadyToSponsorLearner {
  id: string;
  name: string;
  standard: string;
  image_url: string | null;
  created_at: string;
}

export type LearnerStatusFilter = "all" | "available" | "sponsored";

export interface LearnerWithStatus extends ReadyToSponsorLearner {
  is_sponsored: boolean;
  sponsorship_ends_at: string | null;
}

export interface AllLearnersResponse {
  success: boolean;
  data: LearnerWithStatus[];
  counts: Record<LearnerStatusFilter, number>;
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

export interface LearnersResponse {
  success: boolean;
  data: ReadyToSponsorLearner[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

export interface LearnerDetailResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    standard: string;
    image_url: string | null;
  };
}

export interface UnavailableLearner {
  learner_id: string;
  message: string;
}

export interface SponsorOrderStatusResponse {
  success: boolean;
  data: {
    order_id: string;
    status: string;
    plan: string;
    amount: number;
    learner: {
      name: string;
      standard: string;
    } | null;
    sponsored_until: string | null;
    sponsor: {
      name: string;
      email: string;
    } | null;
  };
}
