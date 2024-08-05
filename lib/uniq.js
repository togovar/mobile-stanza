export default array => array.filter((elem, index, self) => self.indexOf(elem) === index);
