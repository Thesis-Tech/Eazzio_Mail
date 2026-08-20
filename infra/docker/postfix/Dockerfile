FROM alpine:3.19
RUN apk add --no-cache postfix cyrus-sasl ca-certificates openssl
COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
RUN touch /etc/postfix/virtual_domains /etc/postfix/virtual_mailboxes && \
    postmap /etc/postfix/virtual_domains /etc/postfix/virtual_mailboxes || true
EXPOSE 25 465 587
CMD ["postfix", "start-fg"]
