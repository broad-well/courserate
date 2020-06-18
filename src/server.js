import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';
import bodyParser from 'body-parser';
import cookieSession from 'cookie-session';
import redirect from '@polka/redirect';

// wiring
import GoogleAuth from './server/auth.google';
import CosmosStore from './server/store.cosmos';
import CourseRate from './server/courserate';
import { check } from 'express-validator';
import { SESSION_KEY } from './secret';

const auth = new GoogleAuth();
const app = new CourseRate(new CosmosStore());

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

const succeed = (res, msg) => res.end(JSON.stringify({message: msg}));
const fail = (res, err) => res.end(JSON.stringify({error: err.toString()}));

const login = (req, email) => req.session.email = email;
const logout = (req) => delete req.session.email;
const userEmail = req => req.session.email;
const requiresLogin = (req, res, next) => {
	const email = userEmail(req);
	if (email == undefined) {
		redirect(res, 302, '/welcome');
	} else {
		req.email = email;
		next();
	}
}
const failable = (req, res, next) => {
	try {
		next();
	} catch (e) {
		fail(res, e);
	}
}


polka() // You can also use Express
	.use(cookieSession({
		name: 'session',
		keys: [SESSION_KEY],
		secure: !dev,
		sameSite: "strict"
	}))

	.post('/login', [bodyParser.urlencoded({extended: false}), check('credential').isString()], async (req, res) => {
		try {
			const {email, name} = await auth.authenticateForEmailName(req.body.credential);
			await app.registerUserIfNotExists(email, name);
			login(req, email);
			redirect(res, '/');

		} catch (e) {
			res.statusCode = 403;
			fail(res, e);
		}
	})

	.get('/logout', async (req, res) => {
		logout(req);
		return redirect(res, '/welcome');
	})

	.get('/welcome', async (req, res) => {
		// TODO local file?
		res.end(`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Sign Into CourseRate</title>
		</head>
		<body>
			<div id="g_id_onload"
				data-client_id="938003961167-i6pfeu8n7acup9h26sk3mik23bm3q9ok"
				data-login_uri="/login">
			</div>
			<script src="https://accounts.google.com/gsi/client" async defer></script>
		
		</body>
		</html>`);
	})

	.post('/api/course/join', [
		requiresLogin,
		bodyParser.json(),
		check('id').isString(),
		failable
	], async (req, res) => {
		await app.joinCourse(req.email, req.body.id, req.body.level);
		succeed(res, "joined course");
	})

	.post('/api/course/star', [
		requiresLogin,
		bodyParser.json(),
		check('id').isString(),
		check('star').isBoolean(),
		failable
	], async (req, res) => {
		await app.setCourseStar(req.email, req.body.id, req.body.star);
		succeed(res, 'course star set to ' + req.body.star);
	})

	.post('/api/review/add', [
		requiresLogin,
		bodyParser.json(),
		check('course_id').isString().isLength({min: 1}),
		check('content').isString().isLength({min: 1}),
		failable
	], async (req, res) => {
		const review = await app.addReviewForId(req.email, req.body.course_id, req.body.content);
		res.end(JSON.stringify(review));
	})

	.post('/api/review/upvote', [
		requiresLogin,
		bodyParser.json(),
		check('id').isString().isLength({min: 1}),
		failable
	], async (req, res) => {
		await app.upvoteReview(req.email, req.body.id);
		succeed(res, 'upvoted review');
	})

	.post('/api/review/downvote', [
		requiresLogin,
		bodyParser.json(),
		check('id').isString().isLength({min: 1}),
		failable
	], async (req, res) => {
		await app.downvoteReview(req.email, req.body.id);
		succeed(res, 'downvoted review');
	})
	// TODO report

	.post('/api/review/remove', [
		requiresLogin,
		bodyParser.json(),
		check('id').isString().isLength({min: 1}),
		failable
	], async (req, res) => {
		await app.removeReview(req.email, req.body.id);
		succeed(res, 'removed review');
	})

	.get('/api/course/search', [
		requiresLogin,
		failable
	], async (req, res) => {
		const query = req.query.q;
		if (query == undefined || query.length < 1) {
			return res.end('[]');
		}
		const results = await app.searchCourses(req.email.split('@')[1], query);
		return res.end(JSON.stringify(results));
	})

	.get('/api/course/:id', [
		requiresLogin,
		failable
	], async (req, res) => {
		const course = await app.course(req.params.id);
		res.end(JSON.stringify(course));
	})

	.get('/api/course/:id/reviews', [
		requiresLogin,
		failable
	], async (req, res) => {
		// TODO block if different domain
		const results = await app.courseReviews(req.params.id);
		res.end(JSON.stringify(results));
	})

	.get('/api/me', [
		requiresLogin
	], async (req, res) => {
		const user = await app.user(req.email);
		res.end(JSON.stringify(user));
	})

	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		sapper.middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
