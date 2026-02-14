
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import authConfig from "@/lib/auth.config"

// Full auth config with Prisma adapter (Node.js runtime only)
// Uses JWT strategy (set in auth.config.ts) for Edge compatibility
export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    callbacks: {
        async jwt({ token, user, account }) {
            // On initial sign-in, add user id and access token to JWT
            if (user) {
                token.id = user.id
            }
            if (account) {
                token.accessToken = account.access_token

                // Update the account in the database with the new tokens/scope
                // This ensures that if scopes change, the DB record is updated
                try {
                    await prisma.account.update({
                        where: {
                            provider_providerAccountId: {
                                provider: account.provider,
                                providerAccountId: account.providerAccountId
                            }
                        },
                        data: {
                            access_token: account.access_token,
                            expires_at: account.expires_at,
                            scope: account.scope,
                            token_type: account.token_type,
                            id_token: account.id_token,
                            // Only update refresh_token if new one provided
                            ...(account.refresh_token && { refresh_token: account.refresh_token })
                        }
                    })
                } catch (error) {
                    console.error("Failed to update account tokens", error)
                }
            }
            return token
        },
        async session({ session, token }) {
            // With JWT strategy, session callback receives token (not user)
            if (session.user && token.id) {
                session.user.id = token.id as string
            }
            return session
        },
    },
})
