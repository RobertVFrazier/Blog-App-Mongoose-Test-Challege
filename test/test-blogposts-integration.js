'use strict';

const chai=require('chai');
const chaiHttp=require('chai-http');
const faker=require('faker');
const mongoose=require('mongoose');
const expect=chai.expect;
const {BlogPost}=require('../models');
const {app, runServer, closeServer}=require('../server');
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/blog-app-test';
chai.use(chaiHttp);

function seedBlogPostData(){
    console.info('Seeding blog post data.');
    const seedData=[];
    for(let i=1; i<=10; i++){
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}


function generateBlogPostData() {
    return {
        title: faker.company.catchPhrase(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        content: faker.lorem.paragraph()
    };
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('BlogPosts API resource', function(){
    before(function() {
        this.timeout(5000);
        return runServer(TEST_DATABASE_URL);
    });
    
      beforeEach(function() {
        return seedBlogPostData();
    });
    
      afterEach(function() {
        return tearDownDb();
    });
    
      after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {

        it('should return all existing blog posts', function() {
          let res;
          return chai.request(app)
            .get('/posts')
            .then(function(_res) {
              res = _res;
              expect(res).to.have.status(200);
              expect(res.body).to.have.lengthOf.at.least(1);
              return BlogPost.count();
            })
            .then(function(count) {
              expect(res.body).to.have.lengthOf(count);
            });
        });
    
        it('should return blog posts with right fields', function() {
          let resBlogPost;
          return chai.request(app)
            .get('/posts')
            .then(function(res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.a('array');
              expect(res.body).to.have.lengthOf.at.least(1);
    
              res.body.forEach(function(blogpost) {
                expect(blogpost).to.be.a('object');
                expect(blogpost).to.include.keys(
                  'title', 'author', 'content');
              });
              resBlogPost = res.body[0];
              return BlogPost.findById(resBlogPost.id);
            })
            .then(function(blogpost) {
    
              expect(resBlogPost.title).to.equal(blogpost.title);
              expect(resBlogPost.author).to.contain(blogpost.author.firstName);
              expect(resBlogPost.author).to.contain(blogpost.author.lastName);
              expect(resBlogPost.content).to.equal(blogpost.content);
            });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog post', function() {
            const newBlogPost = generateBlogPostData();
            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);              
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys(
                        'title', 'author', 'content');
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.title).to.equal(newBlogPost.title);
                    expect(res.body.content).to.be.equal(newBlogPost.content);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(blogPost){
                    expect(blogPost.title).to.equal(newBlogPost.title);
                    expect(blogPost.author.firstName).to.equal(newBlogPost.author.firstName);
                    expect(blogPost.author.lastName).to.equal(newBlogPost.author.lastName);
                    expect(blogPost.content).to.equal(newBlogPost.content);
                });
        });
    });

    describe('PUT endpoint',function(){
        it('should update fields you send over', function() {
            const updateData = {
                title: 'Get Off My Lawn!',
                content: 'spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam spam'
            };
            return BlogPost
                .findOne()
                .then(function(blogPost){
                    updateData.id=blogPost.id;
                    return chai.request(app)
                        .put(`/posts/${blogPost.id}`)
                        .send(updateData);
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(function(blogPost){
                    expect(blogPost.title).to.equal(updateData.title);
                    expect(blogPost.content).to.equal(updateData.content);
                });
        });
    });

    describe('DELETE endpoint', function(){
        it('should delete a blog post by id', function(){
            let blogPost;
            return BlogPost
                .findOne()
                .then(function(_blogPost){
                    blogPost=_blogPost;
                    return chai.request(app).delete(`/posts/${blogPost.id}`);
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(blogPost.id);
                })
                .then(function(_blogPost){
                    expect(_blogPost).to.be.null;
                });
        });
    });
});