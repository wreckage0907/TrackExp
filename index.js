#!/usr/bin/env node
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';

// FUNCTIONS

function getDataDirPath() {
  const homeDir = os.homedir();
  const appDir = '.my-expense-tracker';
  const dataDir = path.join(homeDir, appDir);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

const dataDir = getDataDirPath();
const tabsFilePath = path.join(dataDir, 'tabs.txt');

async function displayContent(content) {
  try {
    const lines = content.trim().split('\n');
    const table = [];
    let maxDescriptionLength = 0;
    let maxAmountLength = 0;

    for (const line of lines) {
      const [description, amountStr] = line.split(':');
      const amount = parseFloat(amountStr.split('(')[0].trim());
      const type = amountStr.split('(')[1].trim().slice(0, -1);

      let formattedAmount;
      if (type === 'Expense') {
        formattedAmount = chalk.red(amount.toFixed(2));
      } else {
        formattedAmount = chalk.green(amount.toFixed(2));
      }

      maxDescriptionLength = Math.max(maxDescriptionLength, description.length);
      maxAmountLength = Math.max(maxAmountLength, formattedAmount.length);

      table.push({ description, formattedAmount });
    }

    const tableWidth = maxDescriptionLength + maxAmountLength + 5;
    const separatorLine = '+' + '-'.repeat(tableWidth - 2) + '+';

    console.log(separatorLine);
    for (const { description, formattedAmount } of table) {
      const descriptionPadded = description.padEnd(maxDescriptionLength, ' ');
      const amountPadded = formattedAmount.padStart(maxAmountLength, ' ');
      const line = `| ${descriptionPadded} | ${amountPadded} |`;
      console.log(line);
    }
    console.log(separatorLine);
  } catch (err) {
    console.error(chalk.red('Error displaying content:', err));
  }
}

const addContent = async (message) => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'content',
      message: message,
      validate: (input) => input.trim().length > 0 || 'Please enter a valid input',
    },
  ]);
  return answers.content;
};

const getExpenseDetails = async () => {
  const name = await addContent('Enter the name of the expense:');
  const amount = await addContent('Enter the amount:');
  const type = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Is this an income or expense?',
      choices: ['Income', 'Expense'],
    },
  ]);

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    console.error(chalk.red('Invalid amount entered. Please enter a valid number.'));
    return null;
  }

  return {
    name,
    amount: parsedAmount,
    type: type.type === 'Income',
  };
};

const run = async () => {
  const expenses = [];

  while (true) {
    const addMore = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Do you want to add an expense?',
        default: false,
      },
    ]);

    if (!addMore.addMore) {
      break;
    }

    const expenseDetails = await getExpenseDetails();
    if (expenseDetails !== null) {
      expenses.push(expenseDetails);
    }
  }
  return expenses;
};

async function createNewTab() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'tabName',
      message: 'Enter the name of the new tab',
      default: 'New tab',
      validate: (input) => input.trim().length > 0 || 'Please enter a valid tab name',
    },
  ]);

  const name = `${answers.tabName.trim()}.txt`;
  const fpath = path.join(dataDir, name);

  try {
    fs.writeFileSync(fpath, '');
    const sleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));
    const stp = chalkAnimation.rainbow(`Tab ${answers.tabName} created`);
    await sleep();
    stp.stop();
    const content = await run();
    if (content.length > 0) {
      const contentToAppend = content
        .map((exp) => `${exp.name}: ${exp.amount} (${exp.type ? 'Income' : 'Expense'})`)
        .join('\n');
      fs.appendFileSync(fpath, contentToAppend);
      fs.appendFileSync(tabsFilePath, `${answers.tabName} -- ${name}\n`);
    } else {
      console.log(chalk.yellow('No expenses added to the new tab.'));
    }
  } catch (err) {
    console.error(chalk.red(`Error creating file ${name}:`, err));
  }
}

async function ExistingTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright('No tabs found'));
    return;
  }

  const tabs = fs
    .readFileSync(tabsFilePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(' -- ');
      return { name, path };
    });

  if (tabs.length === 0) {
    console.log(chalk.red('Tabs not found'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tab',
      message: 'Choose a tab',
      choices: tabs.map((tab) => tab.name),
    },
  ]);

  const selectedTab = tabs.find((tab) => tab.name === answers.tab);
  const tabFilePath = path.join(dataDir, selectedTab.path);

  try {
    const content = fs.readFileSync(tabFilePath, 'utf-8');
    await displayContent(content);

    const morecontent = await run();
    if (morecontent.length > 0) {
      const contentToAppend = morecontent
        .map((exp) => `${exp.name}: ${exp.amount} (${exp.type ? 'Income' : 'Expense'})`)
        .join('\n');

      fs.appendFileSync(tabFilePath, '\n');
      fs.appendFileSync(tabFilePath, contentToAppend);
    } else {
      console.log(chalk.yellow('No new expenses added to the tab.'));
    }
  } catch (err) {
    console.error(chalk.red(`Error reading or writing to file ${selectedTab.path}:`, err));
  }
}

async function deleteTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright('No tabs found'));
    return;
  }

  const tabs = fs
    .readFileSync(tabsFilePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(' -- ');
      return { name, path };
    });

  if (tabs.length === 0) {
    console.log(chalk.red('No tabs found'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tab',
      message: 'Choose a tab to delete',
      choices: tabs.map((tab) => tab.name),
    },
  ]);

  const selectedTab = tabs.find((tab) => tab.name === answers.tab);
  const tabFilePath = path.join(dataDir, selectedTab.path);

  try {
    fs.unlinkSync(tabFilePath);

    const updatedTabs = tabs.filter((t) => t.name !== selectedTab.name);
    const updatedTabsContent = updatedTabs
      .map((t) => `${t.name} -- ${t.path}`)
      .join('\n');
    fs.writeFileSync(tabsFilePath, updatedTabsContent);

    console.log(chalk.green(`Tab "${selectedTab.name}" deleted successfully.`));
  } catch (err) {
    console.error(chalk.red(`Error deleting tab "${selectedTab.name}":`, err));
  }
}

async function displayTab() {
  if (!fs.existsSync(tabsFilePath)) {
    console.log(chalk.redBright('No tabs found'));
    return;
  }

  const tabs = fs
    .readFileSync(tabsFilePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((tab) => {
      const [name, path] = tab.split(' -- ');
      return { name, path };
    });

  if (tabs.length === 0) {
    console.log(chalk.red('No tabs found'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tab',
      message: 'Choose a tab to display',
      choices: tabs.map((tab) => tab.name),
    },
  ]);

  const selectedTab = tabs.find((tab) => tab.name === answers.tab);
  const tabFilePath = path.join(dataDir, selectedTab.path);

  try {
    const content = fs.readFileSync(tabFilePath, 'utf-8');
    await displayContent(content);
  } catch (err) {
    console.error(chalk.red(`Error reading file "${selectedTab.path}":`, err));
  }
}

async function handleAction(answers) {
  if (answers.action === 'Create new tab') {
    await createNewTab();
  } else if (answers.action === 'Append to existing tab') {
    await ExistingTab();
  } else if (answers.action === 'Display Tabs') {
    await displayTab();
  } else if (answers.action === 'Delete a Tab') {
    await deleteTab();
  }
}

// MAIN

async function main() {
  while (true) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          'Create new tab',
          'Append to existing tab',
          'Display Tabs',
          'Delete a Tab',
          'Exit',
        ],
      },
    ]);

    if (answers.action === 'Exit') {
      break;
    }
    await handleAction(answers);
    const sleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(1000);
    console.log(
      chalk.bold(
        chalk.red(
          '---------------------------------------------------------------------------------'
        )
      )
    );
  }
}

await main();