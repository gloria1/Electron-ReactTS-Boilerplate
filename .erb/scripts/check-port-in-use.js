import chalk from 'chalk';
import detectPort from 'detect-port';

const cl = console.log
cl(chalk.black.bgWhite(`>>>> check-port-in-use.js started, process.env.PORT = ${process.env.PORT}`))

const port = process.env.PORT || '1212';

cl(chalk.black.bgWhite(`>>>> check-port-in-use.js - const port set to ${port}`))

detectPort(port, (err, availablePort) => {
  cl(chalk.black.bgWhite(`>>>> check-port-in-use.js - detectPort - const port is ${port}`))
  cl(chalk.black.bgWhite(`>>>> check-port-in-use.js - detectPort - availablePort passed in is ${availablePort}`))

  if (port !== String(availablePort)) {
    throw new Error(
      chalk.whiteBright.bgRed.bold(
        `Port "${port}" on "localhost" is already in use. Please use another port. ex: PORT=4343 npm start`
      )
    );
  } else {
    process.exit(0);
  }
});
