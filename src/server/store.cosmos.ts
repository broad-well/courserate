import Store from "./store";
import { CosmosClient, Database, SqlQuerySpec, Response, ResourceResponse } from '@azure/cosmos';
import credentials from './store.cosmos.secret';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { User, Review, Course, Vote } from "./types";
export type ReviewScoringFunction = (upvotes: number, downvotes: number) => number;

export default class CosmosStore implements Store {
    client: CosmosClient;
    searchClient: SearchClient<Course>;
    db: Database;
    scorer: ReviewScoringFunction;

    constructor(scorer: ReviewScoringFunction) {
        this.scorer = scorer;
        this.client = new CosmosClient(credentials.cosmos);
        this.searchClient = new SearchClient(
            'https://cr-course-search.search.windows.net/',
            'cosmosdb-index',
            new AzureKeyCredential(credentials.searchApiKey));
        this.db = this.client.database('main');
    }

    async getCourse(id: string): Promise<Course> {
        // partition key is schoolDomain. Go figure
        return (await this.db.container('Courses').item(id, id).read<Course>()).resource;
    }

    async upsertCourse(course: Course): Promise<void> {
        await this.db.container('Courses').items.upsert(course);
    }

    async removeReview(review: Review): Promise<void> {
        await this.db.container('Reviews').item(review.id, review.id).delete();
        await this.db.container('RemovedReviews').items.upsert(review);
    }

    async searchCourses(domain: string, query: string, pageSize: number = 40, pageNum: number = 0): Promise<{ id: string; name: string; }[]> {
        const {results} = await this.searchClient.search(query, {
            filter: `schoolDomain eq '${domain}'`,
            top: pageSize,
            skip: pageNum * pageSize
        });

        const output = [];
        for await (const result of results) {
            output.push(result);
        }
        return output;
    }

    async userReviews(userEmail: string, pageSize: number = 200, pageNum: number = 0): Promise<Review[]> {
        const query: SqlQuerySpec = {
            query: 'SELECT * FROM c WHERE c.reviewerEmail = @userEmail ORDER BY c.postTime DESC OFFSET @offset LIMIT @limit',
            parameters: [
                {name: '@userEmail', value: userEmail},
                {name: '@offset', value: pageNum * pageSize},
                {name: '@limit', value: pageSize}
            ]
        };
        const {resources} = await this.db.container('Reviews').items.query(query).fetchAll();
        return resources;
    }

    async topCourseReviews(courseId: string, pageSize: number = 200, pageNum: number = 0): Promise<Review[]> {
        const query: SqlQuerySpec = {
            // TODO figure out how to combine ORDER BY and udf
            query: 'SELECT * FROM c WHERE c.courseId = @courseId ORDER BY c.qualityScore DESC OFFSET 0 LIMIT 1000',
            parameters: [
                {name: '@courseId', value: courseId}
            ]
        };
        const {resources} = await this.db.container('Reviews').items.query(query).fetchAll();
        return resources.slice(pageSize * pageNum, pageSize * (pageNum + 1));
    }

    async isSchoolDomain(domain: string): Promise<boolean> {
        return (await this.schoolName(domain)) !== undefined;
    }

    async schoolName(domain: string): Promise<string|undefined> {
        const query: SqlQuerySpec = {
            query: 'SELECT c.name FROM c WHERE c.domain = @domain',
            parameters: [
                {name: '@domain', value: domain}
            ]
        };
        const response = await this.db.container('Schools').items.query(query).fetchAll();
        if (response.resources.length === 0) return undefined;
        return response.resources[0].name;
    }


    async getUser(email: string): Promise<User|undefined> {
        // do not check this response: 404 is one of the expected outcomes
        return (await this.db.container('Users').item(email, email).read<User>()).resource;
    }
    async upsertUser(user: User): Promise<void> {
        const response = await this.db.container('Users').items.upsert(user);
        this.checkResponse(response);
    }

    async getReview(id: string): Promise<Review|undefined> {
        return (await this.db.container('Reviews').item(id, id).read<Review>()).resource;
    }
    async upsertReview(review: Review): Promise<void> {
        const response = await this.db.container('Reviews').items.upsert(review);
        this.checkResponse(response);
    }
    
    private checkResponse<T>(response: ResourceResponse<T>): void {
        if (response.statusCode >= 300) {
            throw new Error(`failed transaction: status code is ${response.statusCode}`);
        }
    }
}