FROM alpine:3.19
RUN apk add --no-cache rspamd rspamd-controller rspamd-proxy
EXPOSE 11333 11334
CMD ["rspamd", "-f", "-u", "rspamd", "-g", "rspamd"]
