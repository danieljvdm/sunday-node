/* eslint-disable no-unused-expressions */
/* eslint-disable prefer-const */
/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/prefer-default-export */

import express from 'express';
import moment from 'moment';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import log from '../../log';
import Story from '../models/story';
import config from '../../config.json';
import MailService from '../../api/testMailService';
import User from '../models/user';
import { uploadAttachment } from '../../mail/attachments';

const DOMParser = require('xmldom').DOMParser;

export default ({ config, db }) => {
  const nextSunday = moment().endOf('week')
  .add(12, 'hours').add(1, 'milliseconds');
  // ploadAttachment()

  const storyRouter = express.Router();
  storyRouter.use(bodyParser.json());

  storyRouter.route('/')
  .get((req, res, next) => {
    Story.find({})
    .then((stories) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json(stories);
    }, err => next(err))
    .catch(err => next(err));
  })

  .post((req, res, next) => {
    let image = req.body.images;
    let storyImgFileName = 'none';
    req.body.timeCreated = moment().format();
    req.body.weekCommencing = moment(nextSunday).format();
    let promises = [];
    let uploadedImages = [];
    let bufferz = [];
    let sortedBuffer = [];
    let j = -1;
    let newImgBuffers = [];
    async function sendStory() {
      User.findOne({ email: req.body.email })
      .then(async (user) => {
        if (user !== null) {
          req.body.idOfCreator = user._id;
          Story.find({ idOfCreator: user._id })
          .then(async (storyExist) => {
            let storyArr = [];
            let pendingStory = false;
            storyArr = storyExist.map((story) => {
              if (story.weekCommencing === moment(nextSunday).format()) {
                pendingStory = true;
              }
            });
            await Promise.all(storyArr);
            if (storyExist !== null && pendingStory === true) {
              res.status(400).send(`${user.firstName} already has a pending story for this Sunday, you may only have 1 pending story per Sunday`);
            } else {
              let doc = new DOMParser().parseFromString(req.body.text, 'text/html');
              let k = 0;
              const promise = Object.keys(doc.getElementsByTagName('img')).map(async function (img) {
                Object.keys(doc.getElementsByTagName('img')).forEach((key) => {
                  // This was very tough to get to work
                  // Basically, we're searching through the img element and searching for the key's we're interested
                  if (isNaN(parseInt(key)) === true) {
                    // If it's not a number, then we're not interested in it as it doesn't contain the attributes we need to change the src values of the img
                  }
                  else {
                    if (doc.getElementsByTagName('img')[key].getAttribute('class').indexOf('imageClass') >= 0 && k < uploadedImages.length) {
                      // Make var that increments every loop, once for every image in uploadedImages, make var to see how many times it loops
                      doc.getElementsByTagName('img')[key].attributes['1'].nodeValue = `https://s3-eu-west-1.amazonaws.com/sundaystories/${uploadedImages[k]}`;
                      doc.getElementsByTagName('img')[key].attributes['1'].value = `https://s3-eu-west-1.amazonaws.com/sundaystories/${uploadedImages[k]}`;
                    }
                  }
                  k += 1;
                });
              });
              await Promise.all(promise);
              req.body.text = doc;
              Story.create(req.body)
              .then((story) => {
                MailService.create({
                  from: '"Sunday" <write@sundaystori.es>', // sender address
                  to: req.body.email, // list of receivers
                  subject: 'A Sunday Story', // Subject line
                  html: `${story.text}`,
                  // text: `Magic link: ${config.host}/users/me?token=${encodeURIComponent(token)}`,
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(story);
              }, err => next(err))
              .catch(err => next(err));
            }
          });
        } else {
          res.status(400).send('User not found');
        }
      });
    }
    async function imgUpload(outputBuffer) {
      try {
        const idOfUploader = await User.findOne({ email: req.body.email })
        .then((user) => {
          return user._id;
        });
        // Create a crypto ID
        const cryptoImgId = crypto.randomBytes(10).toString('hex');
        // Set the storyImgFileName correctly
        storyImgFileName = `${cryptoImgId}${idOfUploader.toString()}.png`;
        uploadedImages.push(storyImgFileName);
        // Upload the image
        Promise.resolve(uploadAttachment(outputBuffer, `${storyImgFileName}`))
        .then((data) => {
          Promise.resolve(storyImgFileName);
          sortedBuffer.push(outputBuffer);
          return storyImgFileName;
        });
      } catch (err) {
        res.status(400).send('Something went wrong', err);
      }
      return storyImgFileName;
    }
    function resizeImage(images, size) {
      return images;
    }
    function resizeImages(images, size) {
      let promDone = 0;
      let resolvedBuffers = [];
      let newArr = [];
      return new Promise((resolve, reject) => {
        for (let i = 0; i < images.length; i++) {
          const uri = images[i].split(';base64,').pop();
          // eslint-disable-next-line new-
          promDone += 1;
          const imgBuffer = new Buffer.from(uri, 'base64');
          newImgBuffers.push(imgBuffer);
          if (promDone === images.length) {
            resolve(newImgBuffers);
          }
        }
      });
    }
    function execute() {
      let images = image;
      resizeImages(images, 200).then((resolvedBuffers) => {
        promises = newImgBuffers.map((k) => {
          imgUpload(k);
        });
        Promise.all(promises)
        .then((data) => {
          sendStory();
        });
      }).catch((err) => {
        console.log('execute resize error:', err);
      });
    }
    if (image.length > 0) {
      execute();
    } else {
      let storyArr = [];
      let pendingStory = false;
      User.findOne({ email: req.body.email })
      .then(async (user) => {
        if (user !== null) {
          req.body.idOfCreator = user._id;
          Story.find({ idOfCreator: user._id })
          .then(async (storyExist) => {
            storyArr = storyExist.map((story) => {
              if (story.weekCommencing === moment(nextSunday).format()) {
                pendingStory = true;
              }
            });
            await Promise.all(storyArr);
            if (storyExist !== null && pendingStory === true) {
              res.status(400).send(`${user.firstName} already has a pending story for this Sunday, you may only have 1 pending story per Sunday`);
            } else {
              Story.create(req.body)
              .then((story) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(story);
              }, err => next(err))
              .catch(err => next(err));
            }
          });
        } else {
          res.status(400).send('User not found');
        }
      });
    }
  })
  .delete((req, res, next) => {
    Story.findByIdAndRemove(req.params.storyId)
    .then((resp) => {
      if (resp !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({});
      }
      else {
        res.status(400).send('Story not found');
      }
    }, err => next(err))
    .catch(err => next(err));
  });

  // ------storyId------

  storyRouter.route('/:storyId')
  .get((req, res, next) => {
    Story.findById(req.params.storyId)
    .then((story) => {
      if (story !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(story);
      } else {
        res.status(400).send('Story not found');
      }
    }, err => next(err))
    .catch(err => next(err));
  })
  .put((req, res, next) => {
    Story.findByIdAndUpdate(req.params.storyId, {
      $set: req.body,
    }, { new: true })
    .then((story) => {
      if (story !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(story);
      } else {
        res.status(400).send('Story not found');
      }
    }, err => next(err))
    .catch(err => next(err));
  })
  .delete((req, res, next) => {
    // This delete we'll make so that it can only delete the pending story
    Story.findOne({ weekCommencing: moment(nextSunday).format() })
    .then((story) => {
      if (story !== null) {
        Story.findByIdAndRemove(story._id)
        .then((resp) => {
          if (resp !== null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json({});
          } else {
            res.status(400).send('Story not found');
          }
        }, err => next(err))
        .catch(err => next(err));
      } else {
        res.status(400).send('Story not found');
      }
    }, err => next(err))
    .catch(err => next(err));
  });

  return storyRouter;
};

export const deleteAllStories = () => {
  if (config.dev) {
    Story.remove({}, (err) => {
      if (err) {
        return log.info(err);
      }
      // removed!
    });
  } else {
    log.info('Cannot delete all stories unless in dev mode');
  }
};

export const deleteStory = (id) => {
  Story.remove({ _id: id }, (err) => {
    if (err) {
      return log.info(err);
    }
    // removed!
  });
};


/* eslint-enable import/prefer-default-export */

