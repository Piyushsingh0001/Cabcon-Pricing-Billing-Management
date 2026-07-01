PART 1 : System Design Prompt
-----------------------------

You are a Senior Software Architect with 20 years of experience in ASP.NET Core, SQL Server and Angular.

Do NOT generate code.

First design the entire application architecture.

Application Requirements

Current application stores everything in memory.

Convert it into an Enterprise application.

Technology

ASP.NET Core 9 Web API
SQL Server
Entity Framework Core Code First
Angular Latest
JWT Authentication
Role Based Authorization
Angular Material

Design

Use Clean Architecture.

Create following projects.

Presentation

Application

Domain

Infrastructure

Persistence

Shared

Explain responsibility of every project.

Design complete folder structure.

Explain why every folder exists.

Design Entity Relationship Diagram.

Design complete Database schema.

Include

Users

Roles

Permissions

Refresh Tokens

Audit Logs

Products

Categories

SKU

Price History

Settings

Design all relationships.

Explain

One-to-One

One-to-Many

Many-to-Many

Explain how JWT authentication works.

Explain Refresh Token Flow.

Explain Role Based Authorization Flow.

Explain Request Flow

Angular
↓

API

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

DbContext

↓

SQL Server

Also explain

Dependency Injection

Middleware Pipeline

Configuration

Options Pattern

Repository Pattern

Unit of Work

DTO

Entity

ViewModel

Mapping

Validation

Logging

Exception Handling

Do not generate code.

Only architecture.


PART 2 : Database Design
------------------------
Using previous architecture,

Design SQL Server database.

Generate

Complete ER Diagram

Every Table

Primary Keys

Foreign Keys

Unique Constraints

Indexes

Cascade Delete rules

Soft Delete

Audit Columns

CreatedDate

CreatedBy

UpdatedDate

UpdatedBy

DeletedDate

DeletedBy

IsDeleted

Include tables

Users

Roles

Permissions

RolePermissions

UserRoles

RefreshTokens

AuditLogs

Categories

Products

SKUs

PriceHistory

ApplicationSettings

Explain every column.

Explain why datatype is selected.

Do not write API.

Only SQL Server design.


PART 3 : Entity Framework
-------------------------
Generate Entity Framework Core Code First design.

Create

Entities

Configurations

DbContext

Relationships

Fluent API

Migration Strategy

Seed Data

Roles

Admin

Manager

User

Explain every relationship.

Explain why Fluent API is preferred.

Explain DeleteBehavior.

Explain Navigation Properties.

Explain Lazy Loading

Explicit Loading

Eager Loading.

Generate complete DbContext registration.

Do not generate Controller.

PART 4 : Authentication
-----------------------
Build Enterprise Authentication Module.

Technology

JWT

Refresh Token

SQL Server

Entity Framework

Requirements

Login

Logout

Refresh Token

Token Revocation

Password Hashing

Password Reset

Change Password

Email Verification

Account Lock

Failed Login Count

Security Stamp

Role Based Authorization

Explain entire authentication lifecycle.

Generate

Entities

DTO

Service Interfaces

Implementation

Repository

Controller

JWT Generator

Refresh Token Generator

Middleware

Authorization Policy

Swagger Authentication

Explain every line.

Follow SOLID principles.

PART 5 : Authorization
----------------------
Build Enterprise Authorization.

Implement

Roles

Permissions

Claims

Policy Based Authorization

Dynamic Authorization

Resource Based Authorization

Create

Admin

Manager

User

Permission Management API.

Explain

Role

Claim

Permission

Policy

Difference between them.

Generate complete implementation.


PART 6 : Product Module
-----------------------
Build Product Module.

Requirements

CRUD

Category

SKU

Pricing

Price History

Pagination

Searching

Sorting

Filtering

Validation

Audit

Soft Delete

Generate

Entity

DTO

Repository

Service

Controller

Validation

Mapping

Migration

Explain every class.

Use Repository Pattern.

Use Async Programming.

PART 7 : Database Tracking
---------------------------
Previously application stored all data in memory.

Now every operation must be stored in SQL Server.

Track

Product Changes

Price Changes

Login History

Logout History

Failed Login

Role Changes

Audit Logs

API Logs

Exception Logs

Generate database tables.

Generate implementation.

Explain every flow.

PART 8 : Angular Project
------------------------
Generate Angular 20 application.

Use

Standalone Components

Signals

Angular Material

Routing

Lazy Loading

JWT Interceptor

Route Guard

Refresh Token

Role Guard

Permission Guard

Folder Structure

Core

Shared

Features

Auth

Products

Dashboard

Admin

Generate project architecture.

Do not generate backend.

PART 9 : Angular Authentication
-------------------------------
Generate Angular Authentication.

Implement

Login

Logout

JWT Storage

Refresh Token

Interceptor

Guard

Role Guard

Permission Guard

Signal Store

Authentication Service

Generate complete code.

Explain every file.


PART 10 : Angular Product Module
--------------------------------
Generate Product Module.

Use

Reactive Forms

Angular Material

Standalone Components

Signals

HttpClient

Pagination

Sorting

Filtering

CRUD

Dialogs

Snackbars

Loading Spinner

Validation

Generate production quality code.

Explain every component.

PART 11 : Logging & Monitoring
------------------------------
Implement Enterprise Logging.

Use

Serilog

SQL Server

Rolling File Logs

Audit Logs

Performance Logs

Exception Logs

Request Logs

Response Logs

Generate middleware.

Explain logging strategy.

Explain production deployment.


Final Master Prompt (Best Prompt)
----------------------------------
Now combine all previous parts into one complete Enterprise Production Ready Application.

Requirements

Replace In-Memory Storage with SQL Server.

Use Entity Framework Core Code First.

Use JWT Authentication.

Use Refresh Token.

Use Role Based Authorization.

Use Angular Latest.

Use Angular Material.

Implement

Repository Pattern

Unit Of Work

Dependency Injection

Middleware

Global Exception Handling

Logging

Swagger

Pagination

Sorting

Searching

Filtering

Audit Logs

Soft Delete

Price History

Database Tracking

Validation

Mapping

Configuration

Environment Variables

Deployment Ready

Explain every class before writing code.

Generate code module by module.

Never skip files.

Never assume anything.

Always generate production-quality code with detailed explanations.