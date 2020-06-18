import { Review, Course, User, Vote } from "./types";
import nanoid from 'nanoid';

export interface DisplayCourse {
    id: string;
    name: string;
    school: string;
    student_count: number;
    levels: string[];
};

export interface DisplayReview {
    id: string;
    courseId: string;
    text: string;
    post_time: number;
    upvotes: number;
    downvotes: number;
    flagged: boolean;
}

export interface ICourseRate {
    // Reading
    searchCourses(schoolDomain: string, query: string): Promise<DisplayCourse[]>; // FS: 8
    courseReviews(userEmail: string, courseId: string, pageSize?: number, pageNum?: number): Promise<DisplayReview[]>; // FS: 7
    course(userEmail: string, courseId: string): Promise<DisplayCourse>; // FS: 7
    ownReviews(userEmail: string, pageSize?: number, pageNum?: number): Promise<Review[]>; // FS: 3
    isSchoolDomain(domain: string): Promise<boolean>; // FS: 10
    user(email: string): Promise<User|undefined>;
    review(userEmail: string, reviewId: string): Promise<DisplayReview>;

    // Writing
    joinCourse(userEmail: string, courseId: string, level?: string): Promise<void>;
    addReviewForId(userEmail: string, courseId: string, text: string): Promise<DisplayReview>; // FS: 4-5
    upvoteReview(userEmail: string, reviewId: string): Promise<void>; // FS: 6
    removeReview(userEmail: string, reviewId: string): Promise<void>;
    downvoteReview(userEmail: string, reviewId: string): Promise<void>; // FS: 2
    setCourseStar(userEmail: string, courseId: string, star: boolean): Promise<void>; // FS: 4
    registerUserIfNotExists(email: string, name: string): Promise<User>;

    emailDomain(email: string): string;
}

import _ from 'lodash';
import Store from "./store";

export default class CourseRate implements ICourseRate {
    store: Store;

    constructor(store: Store) {
        this.store = store;
    }

    async searchCourses(schoolDomain: string, query: string): Promise<DisplayCourse[]> {
        const courses = await this.store.searchCourses(schoolDomain, query);
        const output = [];
        for (const course of courses) {
            output.push(await this.displayCourse(course));
        }
        return output;
    }

    async courseReviews(userEmail: string, courseId: string, pageSize?: number, pageNum?: number): Promise<DisplayReview[]> {
        await this.course(userEmail, courseId); // To check perms
        const results = await this.store.topCourseReviews(courseId, pageSize, pageNum);
        return results.map(this.displayReview);
    }

    private displayReview(r: Review): DisplayReview {
        return {
            id: r.id,
            courseId: r.courseId,
            text: r.text,
            post_time: r.postTime,
            upvotes: r.upvotes,
            downvotes: r.downvotes,
            flagged: r.flagger !== undefined
        }
    }

    private async displayCourse(c: Course): Promise<DisplayCourse> {
        return {
            id: c.id,
            name: c.name,
            school: await this.store.schoolName(c.schoolDomain),
            student_count: c.enrollCount,
            levels: c.levels
        };
    }

    async course(userEmail: string, courseId: string): Promise<DisplayCourse> {
        const result = await this.store.getCourse(courseId);
        if (result == undefined) throw new Error(`no such course with ID ${courseId}`);
        if (result.schoolDomain !== this.emailDomain(userEmail)) throw new Error(`This course belongs to a different school`);

        return await this.displayCourse(result);
    }

    async user(email: string): Promise<User> {
        const out = await this.store.getUser(email);
        if (out == undefined) throw new Error(`no user with email ${email}`);
        return out;
    }

    async review(email: string, reviewId: string): Promise<DisplayReview> {
        const review = await this.store.getReview(reviewId);
        if (review == undefined) throw new Error(`No review with ID ${reviewId} found`);
        if ((await this.store.getCourse(review.courseId)).schoolDomain !== this.emailDomain(email))
            throw new Error(`This review does not belong to your school`);

        return this.displayReview(review);
    }

    ownReviews(userEmail: string, pageSize?: number, pageNum?: number): Promise<Review[]> {
        return this.store.userReviews(userEmail, pageSize, pageNum);
    }

    isSchoolDomain(domain: string): Promise<boolean> {
        return this.store.isSchoolDomain(domain);
    }

    async addReviewForId(userEmail: string, courseId: string, text: string): Promise<DisplayReview> {
        const user = await this.store.getUser(userEmail);
        if (user == undefined) throw new Error(`no user with email ${userEmail}`);

        if (!(courseId in user.coursesTaken)) {
            throw new Error(`cannot add review for course ${courseId} without taking it`);
        }
        const reviewerLevel = user.coursesTaken[courseId].level;

        const review: Review = {
            id: nanoid.nanoid(12),
            courseId,
            text,
            reviewerEmail: userEmail,
            reviewerLevel,
            upvotes: 0,
            downvotes: 0,
            qualityScore: 0,
            postTime: Date.now()
        };

        review.qualityScore = this.scoreReview(review);
        await this.store.upsertReview(review);
        user.reviews.push(review.id);
        await this.store.upsertUser(user);
        return this.displayReview(review);
    }

    async removeReview(userEmail: string, reviewId: string): Promise<void> {
        const review = await this.store.getReview(reviewId);
        if (review == undefined) return;

        if (review.reviewerEmail !== userEmail) {
            throw new Error('You are not the review\'s owner and therefore cannot remove it');
        }

        await this.store.removeReview(review);

        const user = await this.store.getUser(userEmail);
        _.pull(user.reviews, reviewId);
        await this.store.upsertUser(user);
    }

    async joinCourse(userEmail: string, courseId: string, level?: string): Promise<void> {
        const user = await this.store.getUser(userEmail);
        if (user == undefined) throw new Error(`no user with email ${userEmail}`);

        const alreadyJoined = courseId in user.coursesTaken;
        user.coursesTaken[courseId] = {};
        if (level !== undefined) {
            user.coursesTaken[courseId].level = level;
        }

        const course = await this.store.getCourse(courseId);
        if (course == undefined) throw new Error(`no course with id ${courseId}`);

        if (!alreadyJoined) {
            course.enrollCount++;
        }

        this.store.upsertCourse(course);
        this.store.upsertUser(user);
    }

    async upvoteReview(userEmail: string, reviewId: string): Promise<void> {
        const user = await this.store.getUser(userEmail);
        if (user == undefined) throw new Error(`no user with email ${userEmail}`);

        const lastVote = user.votes[reviewId];
        user.votes[reviewId] = Vote.UP;

        const review = await this.store.getReview(reviewId);
        if (review == undefined) throw new Error(`no review with id ${reviewId}`);

        if (lastVote !== Vote.UP) {
            if (lastVote === Vote.DOWN) {
                review.downvotes--;
            }
            review.upvotes++;
        }
        review.qualityScore = this.scoreReview(review);

        this.store.upsertReview(review);
        this.store.upsertUser(user);
    }

    // something to extract from up & downvotes?

    async downvoteReview(userEmail: string, reviewId: string): Promise<void> {
        const user = await this.store.getUser(userEmail);
        if (user == undefined) throw new Error(`no user with email ${userEmail}`);

        const lastVote = user.votes[reviewId];
        user.votes[reviewId] = Vote.DOWN;

        const review = await this.store.getReview(reviewId);
        if (review == undefined) throw new Error(`no review with id ${reviewId}`);

        if (lastVote !== Vote.DOWN) {
            if (lastVote === Vote.UP) {
                review.upvotes--;
            }
            review.downvotes++;
        }
        review.qualityScore = this.scoreReview(review);

        this.store.upsertReview(review);
        this.store.upsertUser(user);
    }

    async setCourseStar(userEmail: string, courseId: string, star: boolean): Promise<void> {
        const user = await this.store.getUser(userEmail);
        if (user == undefined) {
            throw new Error(`user with email ${userEmail} does not exist`);
        }

        if (star) {
            user.starredCourses = _.union(user.starredCourses, [courseId]);
        } else {
            _.pull(user.starredCourses, courseId);
        }

        await this.store.upsertUser(user);
    }

    async registerUserIfNotExists(email: string, name: string): Promise<User> {
        const user = await this.store.getUser(email);

        if (user == undefined) {
            const userDomain = this.emailDomain(email);
            if (!await this.store.isSchoolDomain(userDomain)) {
                throw new Error(`I don't recognize ${userDomain} as a valid school domain`);
            }
            const newUser: User = {
                email: email,
                name: name,
                starredCourses: [],
                coursesTaken: {},
                votes: {},
                reviews: []
            };
            await this.store.upsertUser(newUser);
            return newUser;
        }

        return user;
    }

    emailDomain(email: string): string {
        return email.split('@')[1];
    }

    private scoreReview(review: Review): number {
        return Math.pow((4 * Math.log10(review.upvotes + 1)), 1.3) -
            Math.pow(review.downvotes, 1.2);
    }
}