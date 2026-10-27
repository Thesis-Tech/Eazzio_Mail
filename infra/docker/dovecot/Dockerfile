FROM alpine:3.19
RUN apk add --no-cache dovecot dovecot-lmtpd dovecot-pop3d openssl && \
    addgroup -g 5000 vmail && \
    adduser -u 5000 -G vmail -s /sbin/nologin -D vmail && \
    mkdir -p /var/mail/vhosts /etc/ssl/certs /etc/ssl/private && \
    openssl req -new -x509 -days 3650 -nodes \
      -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
      -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
      -subj "/CN=localhost" && \
    chmod 600 /etc/ssl/private/ssl-cert-snakeoil.key && \
    chown -R vmail:vmail /var/mail/vhosts
COPY dovecot.conf /etc/dovecot/dovecot.conf
EXPOSE 143 993 110 995 24
CMD ["dovecot", "-F"]
