import ConfigParser
import string

class ConfigReadWriter:

    def __init__(self, filename):
        self.filename = filename
        self.config = ConfigParser.ConfigParser()

    """Get an element value for the named section."""
    def getValue(self,section,element):
        self.config.read(self.filename)
        return self.config.get(section,element)

    """Set the given element to the specified value."""
    def setValue(self,section,element,value):
        fp = open(self.filename)
        self.config.readfp(fp)
        self.config.set(section,element,value)
        self.config.write(open(self.filename,'w'))
        fp.close()

    """Append the specified value to the given element."""
    def appendValue(self,section,element,value):
        fp = open(self.filename)
        self.config.readfp(fp)
        values = self.config.get(section,element)
        list_of_values = values.split(",")
        list_of_values.append(value)
        new_value = ",".join([str(x) for x in list(set(list_of_values))])
        self.config.set(section,element,new_value)
        self.config.write(open(self.filename,'w'))
        fp.close()

    """Get an element value as a list for the named section."""
    def getValuelist(self,section,element):
        values = self.getValue(section,element)
        list_of_values = values.split(",")
        return list_of_values

    def __del__(self):
        del self.config
