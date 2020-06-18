import { User, Course, Review } from "./types";

export default interface Store {
    getUser(email: string): Promise<User|undefined>;
    upsertUser(user: User): Promise<void>;

    getCourse(id: string): Promise<Course|undefined>;
    searchCourses(domain: string, query: string, pageSize?: number, pageNum?: number): Promise<Course[]>;
    upsertCourse(course: Course): Promise<void>;

    userReviews(userEmail: string, pageSize?: number, pageNum?: number): Promise<Review[]>;
    getReview(id: string): Promise<Review|undefined>;
    topCourseReviews(courseId: string, pageSize?: number, pageNum?: number): Promise<Review[]>;
    upsertReview(review: Review): Promise<void>;
    removeReview(review: Review): Promise<void>;

    isSchoolDomain(domain: string): Promise<boolean>;
    schoolName(domain: string): Promise<string|undefined>;
}