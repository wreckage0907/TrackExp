#!/usr/bin/env node
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";

// FUNCTIONS

async function displayContent(content) {
  const lines = content.trim().split("\n");
  const table = [];
  let maxDescriptionLength = 0;
  let maxAmountLength = 0;

  for (const line of lines) {
    const [description, amountStr] = line.split(":");
    const amount = parseFloat(amountStr.split("(")[0].trim());
    const type = amountStr.split("(")[1].trim().slice(0, -1);

    let formattedAmount;
    if (type === "Expense") {
      formattedAmount = chalk.red(amount.toFixed(2));
    } else {
      formattedAmount = chalk.green(amount.toFixed(2));
    }

    maxDescriptionLength = Math.max(maxDescriptionLength, description.length);
    maxAmountLength = Math.max(maxAmountLength, formattedAmount.length);

    table.push({ description, formattedAmount });
  }

  const tableWidth = maxDescriptionLength + maxAmountLength + 5;
  const separatorLine = "+" + "-".repeat(tableWidth - 2) + "+";

  console.log(separatorLine);
  for (const { description, formattedAmount } of table) {
    const descriptionPadded = description.padEnd(maxDescriptionLength, " ");
    const amountPadded = formattedAmount.padStart(maxAmountLength, " ");
    const line = `| ${descriptionPadded} | ${amountPadded} |`;
    console.log(line);
  }
  console.log(separatorLine);
}

const addContent = async (message) => {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "content",
      message: message,
    },
  ]);
  return answers.content;
};

const getExpenseDetails = async () => {
  const name = await addContent("Enter the name of the expense:");
  const amount = await addContent("Enter the amount:");
  const type = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "Is this an income or expense?",
      choices: ["Income", "Expense"],
    },
  ]);

  return {
    name,
    amount: parseFloat(amount),
    type: type.type === "Income",
  };
};

const run = async () => {
  const expenses = [];

  while (true) {
    const addMore = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: "Do you want to add an expense?",
        default: false,
      },
    ]);

    if (!addMore.addMore) {
      break;
    }

    const expenseDetails = await getExpenseDetails();
    expenses.push(expenseDetails);
  }
  return expenses;
};

async function createNewTab() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "tabName",
      message: "Enter the name of the new tab",
      default: "New tab",
    },
  ]);

  const name = `${answers.tabName}.txt`;
  const fpath = path.join(process.cwd(), name);

  try {
    fs.writeFileSync(fpath, "");
    const sleep = (ms = 2000) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const stp = chalkAnimation.rainbow(`Tab ${answers.tabName} created`);
    await sleep();
    stp.stop();
    const content = await run();
    const contentToAppend = content
      .map(
        (exp) =>
          `${exp.name}: ${exp.amount} (${exp.type ? "Income" : "Expense"})`
      )
      .join("\n");
    fs.appendFileSync(fpath, contentToAppend);
    fs.appendFileSync("tabs.txt", `${answers.tabName} -- ${fpath}\n`);
  } catch (err) {
    console.log(chalk.red(`Couldn't create file ${name}`));
  }
}

async function ExistingTab() {
  const tabs = fs
    .readFileSync("tabs.txt", "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(" -- ");
      return { name, path };
    });

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "tab",
      message: "Choose a tab",
      choices: tabs.map((tab) => tab.name),
    },
  ]);

  const tab = tabs.find((tab) => tab.name === answers.tab);
  const content = fs.readFileSync(tab.path, "utf-8");
  await displayContent(content);
  const morecontent = await run();
  const contentToAppend = morecontent
    .map(
      (exp) => `${exp.name}: ${exp.amount} (${exp.type ? "Income" : "Expense"})`
    )
    .join("\n");
  fs.appendFileSync(tab.path, "\n");
  fs.appendFileSync(tab.path, contentToAppend);
}

async function Check(answers) {
  if (answers.action === "Create new tab") {
    await createNewTab();
  }
  if (answers.action === "Use existing tab") {
    await ExistingTab();
  }
  if (answers.action === "Display Tab") {
    const tabs = fs
      .readFileSync("tabs.txt", "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((tab) => {
        const [name, path] = tab.split(" -- ");
        return { name, path };
      });

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "tab",
        message: "Choose a tab",
        choices: tabs.map((tab) => tab.name),
      },
    ]);

    const tab = tabs.find((tab) => tab.name === answers.tab);
    const content = fs.readFileSync(tab.path, "utf-8");
    await displayContent(content);
  }
}

// MAIN
inquirer
  .prompt([
    {
      type: "list",
      name: "action",
      message: "Do you want to create a new tab or use an existing one?",
      choices: [
        "Create new tab",
        "Append to existing tab",
        "Display Tab"
      ],
    },
  ])
  .then(async (answers) => {
    await Check(answers);
  });
