const mongoose = require('mongoose');
const locationsArr = require('./geocoder/assets/locations');
const coordinatesArr = require('./geocoder/assets/coordinates');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/geocoder', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    //useFindAndModify: false,
    //useCreateIndex: true
  }, function(error) {
    // Check error in initial connection. There is no 2nd param to the callback.
    if(error){
        console.log(error);
    }else{
        console.log(`MongoDB Connected`);
    }
    let containsCoordinatesCol = false;
    let containsLocationsCol = false;
    //console.log(mongoose.connection.db);
    mongoose.connection.db.listCollections().toArray(function (err, names) {
        names.forEach(ele => {
            if(ele.name === 'coordinates'){
                containsCoordinatesCol = true;
                console.log("coordinates collection is found");
            }
            if(ele.name === 'locations'){
                containsLocationsCol = true;
                console.log("locations collection is found");
            }
        });
        createCollections(containsLocationsCol,containsCoordinatesCol);
    });
}); 

const geoCoderMasterSchema = new mongoose.Schema({
    admin1_id: Number,
    admin1_name: String,
    country_id: String,
    country_name: String,
    id: Number,
    latitude: Number,
    longitude: Number,
    name: String
});

/*exports.*/ let geoCoderMasterModel = mongoose.model('location', geoCoderMasterSchema);

const geoCoderCoordinatesSchema = new mongoose.Schema({
    feature_id: Number,
    latitude: Number,
    longitude: Number
});

/*exports.*/ let geoCoderCoordinatesModel = mongoose.model('coordinate', geoCoderCoordinatesSchema);

let createCollections = function (containsLocationsCol, containsCoordinatesCol) {
    if(!containsLocationsCol) {
        mongoose.model('location', geoCoderMasterSchema).createCollection().then(function (collection) {
            console.log('"locations" Collection is created!');
            collection.insertMany(locationsArr, function (error, docs) {
                if (error) {
                    console.log('error inserting docs in "location" collection');
                } else {
                    console.log('docs inserted in "location" collection');
                }
            })
        });
    } else {
        console.log('Skip creating "location" collection');
    }

    if(!containsCoordinatesCol){
        mongoose.model('coordinate', geoCoderCoordinatesSchema).createCollection().then(function (collection) {
            console.log('"coordinates" Collection is created!');
            collection.insertMany(coordinatesArr, function (error, docs) {
                if (error) {
                    console.log('error inserting docs in "coordinates" collection');
                } else {
                    console.log('docs inserted in "coordinates" collection');
                }
            })
        });
    }  else {
        console.log('Skip creating "coordinates" collection');
    }
};

let reverseGeoCoder = (req, res) => {
    console.log('Into Reverse Geo Coder :: ' + JSON.stringify(req.body));
    let scale = Math.pow(Math.cos(req.body.lat * Math.PI / 180), 2);
    let query =
        [
            {
                $project: {
                    latitude: 1, longitude: 1, feature_id: 1,
                    proximity: {
                        $let: {
                            vars: {
                                p1: {$multiply: [{$subtract: [parseFloat(req.body.lat), '$latitude']}, {$subtract: [parseFloat(req.body.lat), '$latitude']}]},
                                p2: {$multiply: [scale, {$multiply: [{$subtract: [parseFloat(req.body.long), '$longitude']}, {$subtract: [parseFloat(req.body.long), '$longitude']}]}]},
                            },
                            in: {$add: ["$$p1", "$$p2"]}
                        }
                    }
                }
            },
            {
                $match: {
                    $and: [{
                        "latitude": {
                            "$gte": parseFloat(req.body.lat) - 1.5,
                            "$lte": parseFloat(req.body.lat) + 1.5
                        }
                    },
                        {
                            "longitude": {
                                "$gte": parseFloat(req.body.long) - 1.5,
                                "$lte": parseFloat(req.body.long) + 1.5
                            }
                        }]
                }
            },
            {$sort: {proximity: 1}},
            {$limit: 1}
        ];
        /*geoCoderSchema.*/geoCoderCoordinatesModel.aggregate(query).exec(function (err, obj) {
        if (err) {
            console.log(err);
            console.log('Location not found for :: ' + req.body.lat + ', ' + req.body.long + ' Err:: ' + err);
        } else if (obj) {
            if (obj.length > 0) {
                /*geoCoderSchema.*/geoCoderMasterModel.findOne({
                    "id": obj[0].feature_id
                }).lean().exec(function (error, locationObj) {
                    if (error) {
                        console.log('Location not found for :: ' + req.body.lat + ', ' + req.body.long + ' Error :: ' + error);
                    } else if (locationObj) {
                        console.log('Location found for :: ' + req.body.lat + ', ' + req.body.long + ' :: ' + JSON.stringify(locationObj));
                        res.status(200).send(locationObj);
                    } else {
                        console.log("Location not found for :: " + req.body.lat + ', ' + req.body.long);
                        res.status(500).send("Location not found for :: " + req.body.lat + ', ' + req.body.long);
                    }
                });
            } else {
                console.log('Location not found for :: ' + req.body.lat + ', ' + req.body.long);
                res.status(500).send('Location not found for :: ' + req.body.lat + ', ' + req.body.long);
            }
        } else {
            console.log('Location not found for :: ' + req.body.lat + ', ' + req.body.long);
            res.status(500).send('Location not found for :: ' + req.body.lat + ', ' + req.body.long);
        }
    });
};

app.post("/reverseGeoCoding", reverseGeoCoder);

app.listen(9910, () => {
    console.log('App started on port 9910');
});