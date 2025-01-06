# NERIS NodeJS Api Client

This project contains packages for leveraging the NERIS API. It is open-source so use it however you wish. 

**Ways you might want to use this library**

- Copy it into your codebase, then maintain your own version.
- Fork it and customize it; publish to your private npm registry for use across your platform. 
- Set it up as a git sub-module.

**This repo is**

- A great place to start if you are integrating with the NERIS platform. 
- Maintained by the NERIS team in a best-effort.
- Open to contributions. Please start from [the issue tracker](https://github.com/ulfsri/neris-nodejs-client/issues), especially if a proposed change is large. We can help determine if a change belongs here or in a fork. 
- Used by the NERIS development team internally.

**This repo is not**

- A place to put your product business logic or assumptions.

**Future ideas**

- Compile and publish to a registry, either npm or github.

## Installation

This project uses `npm` because it is standard, boring, and included with NodeJS by default. There are other package managers out there and you might prefer one of them. This is a great reason to consider forking the repo. 

**Using the build script**

Use the included build script to batch the install, codegen, and build steps against production. It also sets executable permissions against the scripts in the tools folder.

```bash
npm install 
node build.mjs
```

or

```bash 
chmod +x ./build.mjs
./build.mjs
```

If you'd like to build the client against the `test` environment, skip to the [Api Client](#api-client).


## Api Client

There are two main things to do in this package

1. Code generation
2. Build

**Code Generation**

The generated files are not checked into this repo; You should re-generate them as needed against whichever environment you desire. There are scripts to help you. In addition to `generate`, you'll find a script for `generate_test` for working with the NERIS pre-release testing environment.

Be sure to run `build` after `generate_*` if you plan to use scripts in the tools folder.

```bash
npm run generate_test
npm run build
```

**Build**

After code generation, you can build the package. The output will be written to the `dist` folder. 

```bash
npm run build
```

⚠️ IMPORTANT ⚠️ - The tools scripts rely on the `dist` folder, not the source folder. If you change something in `api-client/src` and want to integration test it in a tool, then you must rebuild (or you could probably `npm link`)

## Tools & Scripts

The [tools folder](./tools/) contains scripts that perform actions against the api. Each file is a different operation and a script might need to make multiple API calls to complete it's task. 

**How do I pass credentials?**

All tools use `dotenv`.  Just add a `.env` file to the working directory (typically the root of the project). See [the example here](./.env.example)

**How do I run scripts?**

Since you bootstrapped this project with `./build.mjs`, all of the scripts in the [tools folder](./tools/) should be be executable. If you make a new one, either re-run build or just `chmod +x ./tools/path-to-my-tool.ts`

Here are some examples

```bash
$ ./tools/entity/entity.ts FD24027077

{
  "name": "FSRI Fire Department",
  "address_line_1": "6200 Old Dobbin Lane",
  "address_line_2": "Suite 150",
  "city": "Columbia",
  "state": "MD",
  "zip_code": "21045",


  ....
}

✨ Success ✨ 
```


```bash
$ ./tools/api-integrations/create.ts VN00000000 "Test CLI integration"

{
  "id": "34a5dd63-a6ad-4da8-8d60-d5a0210b700d",
  "title": "Test CLI integration",
  "client_id": "376dd1eb-e61b-4d76-be01-01ee71289849",
  "client_secret": "shhhh"
}

✨ Success ✨ 
```

**Why is each script a separate file?**

This could be replaced with a single cli entry point and a bunch of nested operations. These were the early stage motivations and we'll see how these age. 

- The motivation of this library is to provide an API Client. 
- A bunch of small single-use scripts are great for showing how to use the client library. 
- One CLI tool with 10 top level hubs, each hub with 5-10 operations is really 50-100 possible operations. Nothing changes in the complexity cost, just how files are organized. 
- **Isolation** - If there is a bug in one operation it is less likely to break the entire tools directory.
- **Maintenance** - If someone wants to get in and make a small change to a single script, it should be easy; they don't need to sort through hundreds of lines of `argv` parsing and other stuff to find the code. 

As the `tools` directory grows, we'll learn and adjust. If people need to solve very specific problems and the `tools` directory is used for blueprints/examples then this is a good pattern. It could be something else. 

However, if people would like a traditional CLI tool that is versioned and maintained, then someone (community-driven and/or NERIS dev team) will need to be a project owner/maintainer to coordinate a roadmap in collaboration with the community, manage the issue tracker, and create releases.

## Can I use this in a web application?

Yes! 

We haven't worked out the ergonomics yet, but here are a couple ideas. 

- Copy the src folder into your typescript project and just use it. Don't forget the `generate` script from `package.json` so you can update it. 
- Copy the dist folder into you javascript project and just use it. 
- Include this as a git-submodule and orchstrate it with your codebase.
- Fork this repo, then publish the dist folder to your private npm registry, then import it to your web app. This will incur deployment overhead.
