import {ResolvableCollection, resolveCollection} from "../src/common";

import { describe, it, expect } from 'vitest';

describe('Resolvable Collection', () => {
   it('Resolvable Collection can be built from values or functions', () => {
       let unresolved : ResolvableCollection<string, number> = {
           'a' : 1,
           'b': () => 2,
           'c': () => 3
       }
       let resolved: ResolvableCollection<string, number> = resolveCollection(unresolved, {env: {}});
       expect(resolved).toBeTruthy();
       expect(resolved['a']).toStrictEqual(1);
       expect(resolved['b']).toStrictEqual(2);
       expect(resolved['c']).toStrictEqual(3);
   });

   it('ResolvableValue functions may accept a context that has an env', () => {
       let unresolved : ResolvableCollection<string, number> = {
           'a' : 1,
           'b': (context) => context.env.b,
           'c': (context) => context.env.c
       }
       let resolved: ResolvableCollection<string, number> = resolveCollection(unresolved, {env: {b: 2, c: 3}});
       expect(resolved).toBeTruthy();
       expect(resolved['a']).toStrictEqual(1);
       expect(resolved['b']).toStrictEqual(2);
       expect(resolved['c']).toStrictEqual(3);
   })
});