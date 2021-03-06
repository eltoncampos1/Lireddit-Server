import 'reflect-metadata';
import cors from 'cors';
import Redis from 'ioredis';
import session from 'express-session';
import express from 'express';
import connectRedis from 'connect-redis'
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';

import { COOKIE_NAME, __prod__ } from './constants';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { MyContext } from './types';
import { createConnection } from 'typeorm';
import { Post } from './entities/Post';
import { User } from './entities/User';
import path from 'path';
import { Updoot } from './entities/Updoot';


const main = async () => {
    const conn = await createConnection({
        type: 'postgres',
        database: 'lireddit2',
        username: 'postgres',
        password: 'postgres',
        logging: true,
        synchronize: true,
        entities: [Post, User, Updoot],
        migrations: [
            path.join(__dirname, "./migrations/*")
        ],
        port: 5438,
    });
    await conn.runMigrations();


    const app = express();
    const RedisStore = connectRedis(session)
    const redis = new Redis()

    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true,
    }))

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 *24 * 365 *10 ,//10y
                httpOnly: true,
                sameSite: 'lax',
                secure: __prod__, //cookie only works in https
            },
            saveUninitialized: false,
            secret: 'mysecretcookie',
            resave: false,
        })
    );
   
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),
        context: ({ req, res }): MyContext => ( { req, res, redis } )
    });

    apolloServer.applyMiddleware( { app, cors: false } );

    app.listen(4000, () => {
        console.log('[Server]:Running on localhost:4000');
    });
};

main().catch((err) => {
    console.error(err);
});


