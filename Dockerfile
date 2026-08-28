# bide guest TV — static pages behind Caddy.
# Nothing is built; the container just serves public/ with the cache headers
# the design depends on.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY public /srv/public

EXPOSE 8080
