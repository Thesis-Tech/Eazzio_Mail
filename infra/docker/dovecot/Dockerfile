FROM alpine:3.19
RUN apk add --no-cache dovecot dovecot-lmtpd dovecot-pop3d
EXPOSE 143 993 110 995 24
CMD ["dovecot", "-F"]
