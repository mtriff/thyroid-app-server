var bcrypt = require('bcrypt');
var express = require('express');
var mongodb = require('mongodb');

var user = 'matt';
var password = 'test'
var host = '127.0.0.1';
var port = '27017'; // Default MongoDB port
var database = 'thyroidApp';
var connectionString = 'mongodb://' + user + ':' + password +
  '@' + host + ':' + port + '/' + database;

// These will be set once connected, used by other functions below
var usersCollection;
var recordsCollection;

//CORS Middleware, causes Express to allow Cross-Origin Requests
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

var app = express();
app.use(express.bodyParser());
app.use(allowCrossDomain);

// // Get all records associated with the given user
// app.post('/getRecords', function(request, response) {
//   console.log('Sending records');
//   if (!request.body.email || !request.body.password) {
//     return response.send(400, 'Missing log in information.');
//   }
//   getRecords(request, function(err, result) {
//     return response.send(200, result);
//   });
// });

// // Helper function to get all records for a given user
// function getRecords(request, callback) {
//   console.log('Retrieving records.')
//   var query = database.query('SELECT records.date, records.tsh, records.tg, records.synthroidDose '
//     + ' FROM records, user ' + 'WHERE records.user=user.email' + ' AND user.email=? AND user.password=PASSWORD(?)' + ' ORDER BY records.date DESC', [request.body.email,
//     request.body.password
//   ], callback);
// }

// // Updates the records in the database with the provided records
// app.post('/syncRecords', function(request, response) {
//   console.log('Save Records Request Received.');

//   if (!request.body.email || !request.body.password) {
//     return response.send(400, 'Missing log in information.');
//   }

//   var query = database.query('SELECT email FROM user WHERE email=? AND password=PASSWORD(?)', [request.body.email,
//     request.body.password
//   ], function(err, result) {
//     if (err) {
//       return response.send(400, 'Error logging user in.');
//     }
//     if (!result) {
//       return response.send(400, 'Invalid user credentials.');
//     }
//     getRecords(request, function() {
//       var newRecords = request.body.newRecords;
//       var recordsToSave = [];
//       for (var i = 0; i < newRecords.length; i++) {
//         var newRecord = [request.body.email, newRecords[i].date, newRecords[i].tsh, newRecords[i].tg, newRecords[i].synthroidDose];
//         recordsToSave.push(newRecord);
//       }
//       syncRecords(request, response, recordsToSave);
//     });
//   });
// });

// // Helper function to remove all old records and insert all new records
// //  We do this instead of a combination of UPDATE and
// //  INSERT statements to simplify this process
// function syncRecords(request, response, recordsToSave) {
//   var deleteQuery = database.query('DELETE FROM records WHERE user=?', [request.body.email], function(err, result) {
//     if(err) {
//       return response.send(400, 'Error occurred syncing records');
//     }
//     var insertQuery = database.query('INSERT INTO records (user, date, tsh, tg, synthroidDose) VALUES ?', [recordsToSave], function(err, result) {
//       if(err) {
//         return response.send(400, 'Error occurred syncing records');
//       }
//       return response.send(200, 'Records synced.');
//     });
//   });
// }

// // Uses a email address and password to retrieve a user from the database
app.post('/login', function(request, response) {
  console.log('Logging user in');

  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }

  var query = usersCollection.find({
    email: request.body.email
  }, function(err, result) {
    if (err) {
      throw err;
    }
    result.next(function(err, foundUser) {
      if (err) {
        throw err;
      }
      if (!foundUser) {
        return response.send(400, 'User not found.');
      }
      console.log(foundUser);
      if (!bcrypt.compareSync('' + request.body.password, foundUser.password)) {
        return response.send(400, 'Invalid password');
      }
      delete foundUser.password;
      return response.send(200, foundUser);
    });
  });
});

// Creates a new user in the database
app.post('/saveNewUser', function(request, response) {
  console.log('New user being created.');
  var user = request.body.newUser;
  console.log(request.body);
  if (!user.email || !user.newPassword || !user.firstName || !user.lastName || !user.healthCardNumber || !user.dateOfBirth || !user.cancerType || !user.cancerStage || !user.tshRange) {
    return response.json(400, 'Missing a parameter.');
  }

  var salt = bcrypt.genSaltSync(10);
  var passwordString = '' + user.newPassword;
  user.password = bcrypt.hashSync(passwordString, salt);
  user.agreedToLegal = false;

  usersCollection.find({
    email: user.email
  }, function(err, result) {
    if (err) {
      return response.send(400, 'An error occurred creating this user.');
    }
    if (result.length) {
      return response.send(400, 'A user with this email address already exists.');
    }
    usersCollection.insert(user, function(err, result) {
      if (err) {
        return response.send(400, 'An error occurred creating this user.');
      }
      return response.json(200, 'User created successfully!');
    });
  });
});

// // Same as front end code, used to format a Date object appropriately
// function formatDateOfBirth(dateString) {
//   var date = new Date(dateString);
//   var month = date.getMonth()+1;
//   var day = date.getDate();
//   var year = date.getFullYear();
//   return year + '-' +
//     ((''+month).length<2 ? '0' : '') + month + '-' +
//     ((''+day).length<2 ? '0' : '') + day;
// }

// // Update user information
// app.post('/updateUser', function(request, response) {
//   console.log('User being updated.');
//   var user = request.body;
//   if(!user.newPassword) {
//     user.newPassword = user.password;
//   }
//   var query = database.query('UPDATE user SET password=PASSWORD(?), firstName=?, lastName=?, healthCardNumber=?, dateOfBirth=?, cancerType=?, cancerStage=?, tshRange=?, agreedToLegal=? '
//     + 'WHERE email=? and password=PASSWORD(?)', [user.newPassword,
//     user.firstName,
//     user.lastName,
//     user.healthCardNumber,
//     formatDateOfBirth(user.dateOfBirth),
//     user.cancerType,
//     user.cancerStage,
//     user.tshRange,
//     user.agreedToLegal,
//     user.email,
//     user.password
//   ], function(err, result) {
//     if (err) {
//       console.log(err);
//       return response.send(400, 'An error occurred creating this user.');
//     }
//     return response.json(200, 'User created successfully!');
//   });
// });

// Close the database connection and server when the application ends

mongodb.connect(connectionString, function(error, db) {
  if (error) {
    throw error;
  }

  usersCollection = db.collection('users');
  recordsCollection = db.collection('records');

  process.on('SIGTERM', function() {
    console.log("Shutting server down.");
    db.close();
    app.close();
  });

  var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
  });
});