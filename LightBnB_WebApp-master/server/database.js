const { query } = require('express');
const e = require('express');
const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'vagrant',
  host: 'localhost',
  database: 'lightbnb',
  password: '123',
  port: 5432,
})

const properties = require('./json/properties.json');
const users = require('./json/users.json');

// the following assumes that you named your connection variable `pool`
pool.query(`SELECT title FROM properties LIMIT 10;`)
  .then(response => { (response) })
  .catch(err => console.error('query error', err));

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * 
    FROM users
    WHERE users.email LIKE $1`, [email.toLowerCase()])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log('err', err);
    })
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * 
  FROM users
  WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log('err', err);
    })
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(`INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;`, [user.name, user.email, user.password])
    .then((result) => {
      return result
    })
    .catch((err) => {
      console.log("err", err)
    })
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `SELECT
  reservations.*,
  properties.*,
  avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date DESC
  LIMIT 10;`

  return pool
    .query(queryString, [guest_id])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    })
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {

  // Setup an array to hold any parameters that may be available for the query
  const queryParams = [];
  let hasQueryParams = false;
  // Start the query with all information that comes before the WHERE clause
  let queryString = `
  SELECT properties.*,
  avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id \n`;
  console.log("This is the options", options);

  // Check to see if city has been passed
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `\n WHERE city LIKE $${queryParams.length}`;
    hasQueryParams = true;
  }

  //Check to see if minimum price has been passed
  if (options.minimum_cost_per_night) {
    queryParams.push(options.minimum_cost_per_night);
    if (hasQueryParams) {
      queryString += ` AND properties.cost_per_night > ($${queryParams.length} * 100)`;
    }
    else {
      queryString += `\n WHERE properties.cost_per_night > ($${queryParams.length} * 100)`;
      hasQueryParams = true;
    }
  };

  //Check to see if maximum price has been passed
  if (options.maximum_cost_per_night) {
    queryParams.push(options.maximum_cost_per_night);
    if (hasQueryParams) {
      queryString += ` AND properties.cost_per_night < ($${queryParams.length} * 100)`;
    }
    else {
      queryString += `\n WHERE properties.cost_per_night < ($${queryParams.length} * 100)`;
      hasQueryParams = true;
    }
  };

  // Check to see if id has been passed
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    if (hasQueryParams) {
      queryString += ` AND properties.id = $${queryParams.length}`;
    }
    else {
      queryString += `\n WHERE properties.id = $${queryParams.length}`;
      hasQueryParams = true;
    }
  };
  //Check to see if rating has been passed
  let havingClause = '';
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    if (hasQueryParams) {
      havingClause += `\n HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    }
    else {
      havingClause += `\n HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    }
  };

  // 
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ${havingClause}
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryString = `INSERT INTO properties (
    title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url, cover_photo_url, street, country, city, province, post_code, owner_id) 
    VALUES (${"'" + Object.values(property).join("', '") + "'"}) RETURNING *;`;

  return pool
    .query(queryString)
    .then((result) => {
      return result;
    })
    .catch((err) => {
      console.log(err.message);
    })


}
exports.addProperty = addProperty;
