import resource from 'resource-router-middleware';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import facets from '../models/facets';
import api from '.';

// const facets = express.Router();

// facets.route('/')
// .get((req, res, next) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'application/json');
//   res.json(Facets[1]);
// });

// export default facets;

export default ({ config, db }) =>
  resource({
    /** Property name to store preloaded entity on `request`. */
    id: 'fac',

    /** For requests with an `id`, you can auto-load the entity.
    *  Errors terminate the request, success sets `req[id] = data`.
    */
    load(req, id, callback) {
      const facet = facets.find(f => f.id === id);
      const err = facet ? null : 'Not found';
      callback(err, facet);
    },

    /** GET / - List all entities */
    index({ params }, res) {
      res.json(facets);
    },

    /** POST / - Create a new entity */
    create({ body }, res) {
      body.id = facets.length.toString(36);
      facets.push(body);
      res.json(body);
    },

    /** GET /:id - Return a given entity */
    read({ facet }, res) {
      res.json(facet);
    },

    /** PUT /:id - Update a given entity */
    update({ facet, body }, res) {
      Object.keys(body).forEach((key) => {
        if (key !== 'id') {
          facet[key] = body[key];
        }
      });
      res.sendStatus(204);
    },

    /** DELETE /:id - Delete a given entity */
    delete({ facet }, res) {
      facets.splice(facets.indexOf(facet), 1);
      res.sendStatus(204);
    },
  });