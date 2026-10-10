export interface ReadyToSponsorLearner {
  id: string;
  name: string;
  standard: string;
  image_url: string | null;
  created_at: string;
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
    sponsor: {
      name: string;
      email: string;
    } | null;
  };
}
