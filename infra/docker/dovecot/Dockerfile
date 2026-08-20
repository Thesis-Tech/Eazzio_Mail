FROM alpine:3.19
RUN apk add --no-cache dovecot dovecot-lmtpd dovecot-pop3d openssl && \
    addgroup -g 5000 vmail && \
    adduser -u 5000 -G vmail -s /sbin/nologin -D vmail && \
    mkdir -p /var/mail/vhosts && \
    chown -R vmail:vmail /var/mail/vhosts
COPY dovecot.conf /etc/dovecot/dovecot.conf
EXPOSE 143 993 110 995 24
CMD ["dovecot", "-F"]
