export const snakeToCamel = (str: string) =>
  `${str[0].toUpperCase()}${str.substr(1)}`.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
