import { gql, ApolloServer, UserInputError } from 'apollo-server';
import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';

enum YesNo {
  yes = 'YES',
  no = 'NO',
}

interface Person {
  name: string;
  phone?: string;
  email?: string;
  city: string;
  street: string;
  id: string;
}
type AddPersonArgs = Pick<Person, 'name' | 'phone' | 'street' | 'city'>;

const people: Person[] = [
  {
    name: 'John Doe',
    phone: '555-555-5555',
    email: 'johndoe@example.com',
    city: 'Anytown',
    street: '123 Main St',
    id: '3d3d51cc-6d5c-4d10-8d32-2b193d485819',
  },
  {
    name: 'Jane Doe',
    phone: '555-555-5555',
    email: 'janedoe@example.com',
    city: 'Anytown',
    street: '123 Main St',
    id: '3d3d51cc-6d5c-4d10-8d32-2b193d485820',
  },
  {
    name: 'John Smith',
    email: 'johnsmith',
    city: 'Anytown',
    street: '123 Main St',
    id: '3d3d51cc-6d5c-4d10-8d32-2b193d485821',
  },
];

// Use GraphQL to query for people
const typeDefs = gql`
  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String!
    complete: String!
  }

  type Person {
    name: String!
    phone: String
    email: String
    address: Address!
    id: ID!
  }

  type Query {
    personCount: Int!
    allPeople(byPhone: YesNo): [Person!]!
    getPersonByName(name: String!): Person
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editPhone(
        name: String!
        phone: String!
    ): Person
  }
`;

// How to resolve the queries (based on the typeDefs)
const resolvers = {
  Query: {
    personCount: () => people.length,
    allPeople: async (root, args: { byPhone: YesNo }) => {
      const { data: peopleFromRestApi } = await axios.get<Person[]>('http://localhost:3000/person');

      if (!args.byPhone) return peopleFromRestApi;

      // Filter the people by the ENUM GraphQL type 'YES' | 'NO'
      return peopleFromRestApi.filter((p) =>
        args.byPhone === 'YES' ? p.phone : !p.phone
      );
    },
    getPersonByName: (root: Person, args: { name: string }) => {
      const { name } = args;
      return people.find((person) => person.name === name);
    },
  },
  Mutation: {
    addPerson: (root: Person, args: AddPersonArgs) => {
      // Throw UserInputError if the person already exist
      const foundPerson = people.find((p) => p.name === args.name);
      if (foundPerson != null)
        throw new UserInputError('Person already exists.', {
          invalidArgs: args.name,
        });

      // Push the person to the fake db
      const person = { ...args, id: uuidV4() } as Person;
      people.push(person);
      return person;
    },
    editPhone: (root, args: { name: string, phone: string }) => {
        const personIndex = people.findIndex(p => p.name = args.name);
        if (personIndex === -1) {
            throw new UserInputError('Person does not exists.', {
                invalidArgs: args.name,
              });
        }

        people[personIndex].phone = args.phone;
        return people[personIndex];
    }
  },
  Person: {
    address: (root: Person) => ({
      street: root.street,
      city: root.city,
      complete: `${root.street}, ${root.city}`,
    }),
  },
};

// Create the server and start it
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server
  .listen({ port: 4000 })
  .then(({ url }) => {
    console.log(`Server ready at ${url}`);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
