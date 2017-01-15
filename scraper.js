/*
 |--------------------------------------------------------------------------
 | Declare Variables/Requires
 |--------------------------------------------------------------------------
*/

// Initial requires
var request = require('request');
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var fs = require('fs');

// Variables
var dir = './data';
var url = 'http://shirts4mike.com/';
var allShirts = url + 'shirts.php';
var shirtEndpoints = [];
var fields =['Title', 'Price', 'ImageURL', 'URL', 'Time'];

// Date/file variables
var dt = new Date();
var y = dt.getFullYear();
var m = dt.getMonth() + 1;
var d = dt.getDate();
var fileName = y + '-' + m + '-' + d + '.csv';
var path = './data/' + fileName;

/*
 |--------------------------------------------------------------------------
 | Functions
 |--------------------------------------------------------------------------
*/

// Check if 'data' directory exists, if not make directory
function makeDir() {
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// Scrape for individual shirt urls and store them
function getShirtURLS() {
    // Create new promise
    return new Promise(function(resolve, reject) {
        // Initial request to 'shirts.php' page
        request(allShirts, function(error, response, body) {
            if(!error && response.statusCode === 200) {
                var $ = cheerio.load(body);
                // Store all the shirt links to a variable
                var shirts = $('.products li').find('a');
                // Find 'href' attribute for each link and push to an array
                shirts.each(function(){
                    shirtEndpoints.push($(this).attr('href'));
                });
                // Use .map() to create a new array 'shirURLS' and assign
                // the above 'href' attributes to the base url
                var shirtURLS = shirtEndpoints.map(function(endp) {
                    return url + endp;
                });
                // Resolve promise
                resolve(shirtURLS);
            } else {
                reject('There was an error retrieving the data. Cannont connect to http://shirts4mike.com');
            }
        }); // End request
    }); // End promise
} // End function
       
// Scrape individual urls and pull details 
function getShirtInfo() {
    // Return and call getShirtURLS function, pass in shirtURLS info to 'shirtData' argument
    return getShirtURLS().then(function(shirtData) {
        // Create new array with .map(), pass in shirtData to 'endp' argument
        var sObject = shirtData.map(function(endp) {
            // Create a new promise for each item/url in the array
            return new Promise(function(resolve, reject) {
                // Call a request for each url
                request(endp, function(error, response, body) {
                    if(!error && response.statusCode === 200) {
                        var $ = cheerio.load(body);
                        // Create 'shirtInfo' object and pull details from the body
                        // returned for each url using cheerio
                        var shirtInfo = {
                            Title: $('.shirt-details h1').text().slice(4),
                            Price: $('.price').text(),
                            ImageURL: $('.shirt-picture img').attr('src'),
                            URL: endp,
                            Time: new Date().toLocaleString()
                        }
                        // Resolve promise
                        resolve(shirtInfo);
                    } else {
                        reject('There was an error retrieving the shirt details.');
                    }
                }); // End request
            }); // End promise
        }); // End .map() function

        // Return sObject w/ shirt details after all other promises have been resolved
        return Promise.all(sObject);
        // Then call new function to pass in and return shirtData
    }).then(function(shirtData) {
            return shirtData;
            // Handle errors
        }).catch(function(error) {
            return Promise.reject(error);
        });
}

/*
 |--------------------------------------------------------------------------
 | Call Functions
 |--------------------------------------------------------------------------
*/

// Make directory
makeDir();
// Main function call
getShirtInfo()
    .then(function(shirtData) {
        // Use json2csv to write all the details to a csv file and save it in the 'data' directory
        var csv = json2csv({data: shirtData, fields: fields});
        fs.writeFile(path, csv, function(error){
            if(error) throw error;
            console.log('Scrape successful! File saved to .' + path);
        });
    }).catch(function(error) {
        console.log(error);
    });