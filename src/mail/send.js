import nodemailer from 'nodemailer';
import Email from 'email-templates';
import log from '../log';
import { cmd } from '../mail/commands';
import { dummies, dummyname } from '../mail/dummies';
import { boundaries } from '../mail/boundaries';
import config from '../config.json';

const transporter = nodemailer.createTransport({
  service: 'postmark',
  auth: {
    user: config.postmark,
    pass: config.postmark,
  },
});

// Don't ever let previews happen in live mode
if (!config.dev) {
  config.preview = false;
}

export const sendMail = (template, to, locals, inReplyTo, subject) => {
  // Add commands for use
  locals.cmd = cmd;
  locals.dummies = dummies;
  locals.dummyname = dummyname;
  locals.boundaries = boundaries;
  // Create reusable transporter object using the default SMTP transport
  const email = new Email({
    message: {
      from: '"Sunday" <write@sundaystori.es>',
    },
    send: config.send,
    transport: transporter,
    preview: config.preview, // Toggle here to avoid annoying popup
  });

  email
    .send({
      template,
      message: {
        to,
        subject,
        inReplyTo,
        references: [inReplyTo],
      },
      locals,
    })
    .then(log.info(`${to}: sent ${template}`))
    .catch(console.error);
};
