FROM alpine:3.19
RUN apk add --no-cache postfix cyrus-sasl ca-certificates
EXPOSE 25 587
CMD ["postfix", "start-fg"]
