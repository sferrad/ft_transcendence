FROM docker.io/redis:7-alpine

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]



# 🧠 Rôle de Redis dans TON projet

# Redis va servir à 3 choses importantes :

# 1. 🔐 Sessions / tokens (JWT blacklist)
# logout
# invalidation de token
# refresh token storage
# 2. 🚦 Rate limiting (login/register)
# éviter brute force
# 3. ⚡ Cache (optionnel mais utile)
# user profile
# leaderboard / game state