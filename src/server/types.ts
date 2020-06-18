export interface School {
    name: string;
    domain: string;
}

export interface Course {
    id: string;
    schoolDomain: string;
    name: string;
    levels: string[];

    // reactive in db
    enrollCount: number;
}

export interface Review {
    id: string;
    courseId: string;
    text: string;
    reviewerEmail: string;
    reviewerLevel?: string; // binding

    upvotes: number; // binding
    downvotes: number; // binding
    qualityScore: number; // binding

    postTime: number;
    flagger?: string;
}

export interface Enrollment {
    level?: string;
}

export enum Vote {
    UP = 1, DOWN = -1
}

export interface User {
    email: string;
    name: string;

    starredCourses: string[];
    coursesTaken: {[courseId: string]: Enrollment};

    votes: {[reviewId: string]: Vote};
    reviews: string[];
}