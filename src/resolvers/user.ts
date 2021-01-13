import { UserNamePasswordInput } from "../inputs/usernamePasswordInput";
import { Arg, Ctx, Field, Mutation, ObjectType, Resolver } from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from 'argon2';

@ObjectType()
class FieldError {
    @Field()
    field: string;

    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UserNamePasswordInput,
        @Ctx() { em }: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <= 2) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "length must be greater than 2"
                    },
                ],
            };
        }

        if (options.password.length <= 2) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "length must be greater than 2"
                    },
                ],
            };
        }
        const hashedpassword = await argon2.hash(options.password);
        const user = em.create(User, { username: options.username, password: hashedpassword});
        try {
            await em.persistAndFlush(user);
        } catch (err) {
            ///duplicate username error
            if (err.code === '23505' ) {//|| err.detail.includes('Already exists')) {
                return {
                    errors:[{
                        field: 'username',
                        message: 'sername already taken',
                    }]
                }
            }
           
        }
        return { 
            user,
        };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UserNamePasswordInput,
        @Ctx() { em }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, { username: options.username });
        if (!user) {
            return {
                errors: [{
                     field: 'username',
                     message: "That username dosen't exists"
                    },
                ],
            };
        }
        const valid = await argon2.verify(user.password, options.password);
        if (!valid) {
            return {
                errors: [{
                     field: 'password',
                     message: "Incorrect Password"
                    },
                ],
            };
        }
        return {
            user,
        };
    }
}