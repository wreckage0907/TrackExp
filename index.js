#!/usr/bin/env node
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import os from "os";

// FUNCTIONS

function getDataDirPath() {
  const homeDir = os.homedir();
  const appDir = ".my-expense-tracker";
  const dataDir = path.join(homeDir, appDir);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

const dataDir = getDataDirPath();
const tabsFilePath = path.join(dataDir, "tabs.txt");

async function displayContent(content) {
  try {
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
  } catch (err) {
    console.log(chalk.red("No content found"));
  }
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
  const fpath = path.join(dataDir, name);

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
    fs.appendFileSync(tabsFilePath, `${answers.tabName} -- ${name}\n`);
  } catch (err) {
    console.log(chalk.red(`Couldn't create file ${name}`));
  }
}

async function ExistingTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright("No tabs found"));
    return;
  }
  const tabs = fs
    .readFileSync(tabsFilePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(" -- ");
      return { name, path };
    });
  if(!tabs){
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "tab",
      message: "Choose a tab",
      choices: tabs.map((tab) => tab.name),
    },
  ]);

  const tab = tabs.find((tab) => tab.name === answers.tab);
  const content = fs.readFileSync(path.join(dataDir, tab.path), "utf-8");
  await displayContent(content);
  const morecontent = await run();
  const contentToAppend = morecontent
    .map(
      (exp) => `${exp.name}: ${exp.amount} (${exp.type ? "Income" : "Expense"})`
    )
    .join("\n");

  fs.appendFileSync(path.join(dataDir, tab.path), "\n");
  fs.appendFileSync(path.join(dataDir, tab.path), contentToAppend);}
  else{
    console.log(chalk.red("Tabs not found"));
  }
}

async function deleteTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright("No tabs found"));
    return;
  }
  const tabs = fs
    .readFileSync(tabsFilePath, "utf-8")
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

  const tabFilePath = path.join(dataDir, tab.path);
  fs.unlinkSync(tabFilePath);

  const updatedTabs = tabs.filter((t) => t.name !== tab.name);
  const updatedTabsContent = updatedTabs
    .map((t) => `${t.name} -- ${t.path}`)
    .join("\n");
  fs.writeFileSync(tabsFilePath, updatedTabsContent);
}

async function displayTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright("No tabs found"));
    return;
  }
  const tabs = fs
    .readFileSync(tabsFilePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(" -- ");
      return { name, path };
    });

  if (!tabs) {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "tab",
        message: "Choose a tab",
        choices: tabs.map((tab) => tab.name),
      },
    ]);
    const tab = tabs.find((tab) => tab.name === answers.tab);
    const content = fs.readFileSync(path.join(dataDir, tab.path), "utf-8");
    await displayContent(content);
  } else {
    console.log(chalk.red("Tabs not found"));
  }
}

async function Check(answers) {
  if (answers.action === "Create new tab") {
    await createNewTab();
  }
  if (answers.action === "Append to existing tab") {
    await ExistingTab();
  }
  if (answers.action === "Display Tabs") {
    await displayTab();
  }
  if (answers.action === "Delete a Tab") {
    await deleteTab();
  }
}

// MAIN

async function main() {
  while (true) {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What do you want to do?",
        choices: [
          "Create new tab",
          "Append to existing tab",
          "Display Tabs",
          "Delete a Tab",
          "Exit",
        ],
      },
    ]);

    if (answers.action === "Exit") {
      break;
    }
    await Check(answers);
    const sleep = (ms = 2000) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(1000);
    console.log(
      chalk.bold(
        chalk.red(
          "---------------------------------------------------------------------------------"
        )
      )
    );
  }
}

await main();
